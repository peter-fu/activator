package activator

object AnsiToHtml {

  private def ansiToTag(endCode: Int, args: String): String = {
    endCode match {
      case 'm' =>
        if (args == "0") {
          "</span>"
        } else if (args.startsWith("3")) {
          val color = args match {
            case "30" => "black"
            case "31" => "red"
            case "32" => "green"
            case "33" => "yellow"
            case "34" => "blue"
            case "35" => "magenta"
            case "36" => "cyan"
            case "37" => "white"
            case _ => ""
          }
          s"""<span style="color: ${color}">"""
        } else if (args.startsWith("4")) {
          val color = args match {
            case "40" => "black"
            case "41" => "red"
            case "42" => "green"
            case "43" => "yellow"
            case "44" => "blue"
            case "45" => "magenta"
            case "46" => "cyan"
            case "47" => "white"
            case _ => ""
          }
          s"""<span style="background-color: ${color}">"""
        } else {
          s"<span>"
        }
      case _ => ""
    }
  }

  def ansiToHtml(text: String): String = {
    val builder = new StringBuilder(text.length + 7)
    var i = 0
    while (i < text.length) {
      text.charAt(i) match {
        case '<' => builder.append("&lt;")
        case '>' => builder.append("&gt;")
        case '"' => builder.append("&quot;")
        case '\'' => builder.append("&#x27;")
        case '&' => builder.append("&amp;")
        case 27 if ((i + 1) < text.length) && (text.charAt(i + 1) == '[') =>
          // any character in 64-126 ends the sequence (which is mostly
          // letters, notably not digits)
          var j = i + 2
          while (j < text.length && (text.charAt(j) < 64 || text.charAt(j) > 126)) {
            j += 1;
          }
          val (endCode, args): (Int, String) =
            if (j < text.length) {
              (text.charAt(j), text.substring(i + 2, j))
            } else {
              (0, "")
            }
          i = j // note that this will still get another +1 below
          builder.append(ansiToTag(endCode, args))
        case '\r' =>
        // ignore carriage return
        case c =>
          builder.append(c)
      }
      i += 1
    }
    builder.toString()
  }
}
