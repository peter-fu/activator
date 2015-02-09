package sbt.hack

import sbt.serialization._

object PickleToJson {
  def apply[T](t: T)(implicit pickler: Pickler[T]): String =
    SerializedValue(t).toJsonString
}
