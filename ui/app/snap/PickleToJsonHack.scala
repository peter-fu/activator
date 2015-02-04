package sbt.hack

import sbt.serialization._

object PickleToJson {
  def apply[T](t: T)(implicit pickler: scala.pickling.SPickler[T]): String =
    SerializedValue(t).toJsonString
}
