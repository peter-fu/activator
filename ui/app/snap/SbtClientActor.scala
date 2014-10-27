package snap

import akka.actor._
import akka.pattern._

import play.api.libs.json.Writes

import sbt.client.{ TaskKey, Subscription, SbtClient }
import sbt.protocol._

import scala.concurrent.Future
import scala.reflect.ClassTag
import scala.util.control.NonFatal
import scala.concurrent.ExecutionContext.Implicits.global

class SbtClientActor(val client: SbtClient) extends Actor with ActorLogging {
  log.debug(s"Creating SbtClientActor ${self.path.name}")

  override val supervisorStrategy = SupervisorStrategy.stoppingStrategy

  val eventsSub = client.handleEvents { event =>
    self ! event
  }
  val buildSub = client.watchBuild { structure =>
    self ! structure
  }

  // this is a hardcoded hack... we need to control the list of things
  // to watch from JS, and we should handle build structure changes
  // by redoing this
  val valueSub = new Subscription() {
    val futureValueSubs: Seq[Future[Seq[Subscription]]] =
      Seq("discoveredMainClasses",
        "mainClasses",
        "mainClass",
        "libraryDependencies") map { name =>
          client.lookupScopedKey(name) map { scopeds =>
            scopeds map { scoped =>
              log.debug(s"Subscribing to key ${scoped}")
              client.rawWatch(TaskKey[Seq[String]](scoped)) { (key, result) =>
                self ! ValueChanged(key, result)
              }
            }
          }
        }
    override def cancel(): Unit = {
      futureValueSubs map { futureSubs => futureSubs map { subs => subs map { sub => sub.cancel() } } }
    }
  }

  override def postStop(): Unit = {
    log.debug("postStop")
    eventsSub.cancel()
    buildSub.cancel()
    valueSub.cancel()
    // we were probably stopped because the client closed already,
    // but if not, close here.
    client.close()
  }

  private def forwardOverSocket[T <: Event: Writes: ClassTag](event: T): Unit = {
    context.parent ! NotifyWebSocket(SbtProtocol.wrapEvent(event))
  }

  def produceLog(level: String, message: String): Unit = {
    context.parent ! NotifyWebSocket(SbtProtocol.synthesizeLogEvent(level, message))
  }

  override def receive = {
    case event: Event => event match {
      case _: ClosedEvent =>
        self ! PoisonPill
      case _: BuildStructureChanged =>
        // this should not happen unless during development, hence the error level
        log.error(s"Received event which should have been filtered out by SbtClient ${event}")
      case changed: ValueChanged => forwardOverSocket(changed)
      case entry: LogEvent => entry match {
        case e: CoreLogEvent => forwardOverSocket(e)
        case e: TaskLogEvent => forwardOverSocket(e)
        case e: BackgroundJobLogEvent => forwardOverSocket(e)
      }
      case fail: ExecutionFailure => forwardOverSocket(fail)
      case yay: ExecutionSuccess => forwardOverSocket(yay)
      case starting: ExecutionStarting => forwardOverSocket(starting)
      case waiting: ExecutionWaiting => forwardOverSocket(waiting)
      case finished: TaskFinished => forwardOverSocket(finished)
      case started: TaskStarted => forwardOverSocket(started)
      case taskEvent: TaskEvent => forwardOverSocket(taskEvent)
      case loaded: BuildLoaded => forwardOverSocket(loaded)
      case failed: BuildFailedToLoad => forwardOverSocket(failed)
      case background: BackgroundJobEvent => forwardOverSocket(background)
      case background: BackgroundJobStarted => forwardOverSocket(background)
      case background: BackgroundJobFinished => forwardOverSocket(background)
    }
    case structure: MinimalBuildStructure =>
      forwardOverSocket(BuildStructureChanged(structure))
    case req: ClientAppRequest => {
      req match {
        case re: RequestExecution =>
          log.debug("requesting execution of " + re.command)
          client.requestExecution(re.command.get, interaction = None)
        case ce: CancelExecution =>
          log.debug("canceling execution " + ce.executionId)
          client.cancelExecution(ce.executionId)
        case pac: PossibleAutoCompletions =>
          log.debug("possible autocompletions for " + pac.command.get)
          client.possibleAutocompletions(pac.command.get, detailLevel = pac.detailLevel.getOrElse(0))
        case rsd: RequestSelfDestruct =>
          log.debug("Asking sbt to exit")
          client.requestSelfDestruct()
          Future.successful(None)
      }
    } recover {
      case NonFatal(e) =>
        log.debug(s"request to sbt failed ${e.getMessage}")
        produceLog(LogMessage.DEBUG, s"request $req failed: ${e.getClass.getName}: ${e.getMessage}")
        Status.Failure(e)
    } map { result =>
      log.debug(s"${req} result: ${result}")
      produceLog(LogMessage.DEBUG, s"request $req result: ${result}")
      SbtClientResponse(req.serialId, result, req.command)
    } pipeTo sender
  }
}
