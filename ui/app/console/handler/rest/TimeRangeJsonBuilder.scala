/**
 * Copyright (C) 2016 Lightbend, Inc <http://www.lightbend.com>
 */
package console.handler.rest
import play.api.libs.json.{ Json, JsObject }
import activator.analytics.data.{ TimeRange, Scope, ActorStats }

object TimeRangeJsonBuilder {
  def createTimeRangeJson(timeRange: TimeRange): JsObject =
    Json.obj(
      "startTime" -> timeRange.startTime,
      "endTime" -> timeRange.endTime,
      "rangeType" -> timeRange.rangeType.toString)
}
