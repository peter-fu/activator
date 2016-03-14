/**
 * Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
package controllers.api

import play.api.mvc.{ Action, Controller }
import play.api.data._
import play.api.Logger
import scala.util.control.NonFatal
import play.api.libs.ws._

object Proxy extends Controller {
  import play.api.Play.current

  def getTypesafe(path: String) = Action.async { request =>
    val holder = WS.url(s"https://lightbend.com/$path")
      .withHeaders("Accept" -> "text/html")
      .withRequestTimeout(25000)
      .withFollowRedirects(true)

    import concurrent.ExecutionContext.Implicits._
    holder.get map { response =>
      Ok(response.body)
    }
  }
}
