/**
 * Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
package console.handler.rest
import play.api.libs.json.{ Json, JsObject }
import activator.analytics.data.{ TimeRange, Scope, ActorStats }

object ScopeJsonBuilder {
  def createScopeJson(scope: Scope): JsObject = {
    val node = scope.node.getOrElse("")
    val actorSystem = scope.actorSystem.getOrElse("")
    val path = scope.path.getOrElse("")
    val dispatcher = scope.dispatcher.getOrElse("")
    val tag = scope.tag.getOrElse("")
    val playPattern = scope.playPattern.getOrElse("")
    val playController = scope.playController.getOrElse("")
    Json.obj(
      "node" -> node,
      "actorSystem" -> actorSystem,
      "actorPath" -> path,
      "dispatcher" -> dispatcher,
      "tag" -> tag,
      "playPattern" -> playPattern,
      "playController" -> playController)
  }
}
