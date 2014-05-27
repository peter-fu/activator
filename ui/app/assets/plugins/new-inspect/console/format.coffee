define ->
  class Format
    shortenNumber: (n, decimals = 1) ->
      return n if n < 1000
      return parseFloat((n / 1000).toFixed(decimals)) + 'k' if n < 1000000
      return parseFloat((n / 1000000).toFixed(decimals)) + 'M'

    cut: (num, dig) ->
      shorty = ((if num isnt undefined then num else "N/A") + "").slice 0, dig || num.length
      if shorty.indexOf(".") == shorty.length - 1 then shorty = shorty.slice(0,-1)
      shorty

    shorten: (num) -> @cut num, 5

    mini: (num) -> @cut num, 3

    units: (unit="", val, formatter) ->
      wasBad = val is undefined or val is null
      val = 0 if wasBad

      apply = (uvArray) ->
        uvArray = ["", "N/A"] if wasBad
        if formatter
          return formatter(uvArray[0], uvArray[1])
        else
          return uvArray[1] + wordSpace + uvArray[0]

      parsedVal = parseFloat(val, 10)
      wasBad = true if isNaN(parsedVal)

      wordSpace = if unit == "%" then "" else " "

      shorten = (u, v) ->
        switch u
          when "messages/second" then ["msg/s", v]
          when "messages/millisecond" then ["msg/ms", v]
          when "minutes" then ["mins", v]
          when "seconds"
            if v > 60 * 10
              shorten("minutes", v / 60 * 10)
            else
              ["s", v]
          when "milliseconds"
            if v > 10000
              shorten("seconds", v / 1000)
            else
              ["ms", v]
          when "microseconds"
            if v > 10000
              shorten("milliseconds", v / 1000)
            else
              micro = String.fromCharCode(0xB5)
              [micro + 's', v]
          when "bytes"
            if v > 10000
              shorten("kilobytes", v / 1024)
            else
              ["B", v]
          when "kilobytes"
            if v > 10000
              shorten("megabytes", v / 1024)
            else
              ["kB", v]
          when "megabytes"
            ["MB", v]
          when "bytes/second"
            if v > 10000
              shorten("kilobytes/second", v / 1024)
            else
              ["B/s", v]
          when "kilobytes/second"
            if v > 10000
              shorten("megabytes/second", v / 1024)
            else
              ["kB/s", v]
          when "megabytes/second"
            ["MB/s", v]

          else [u, v]

      apply(shorten(unit, parsedVal))

    humanReadableDuration: (v, unit, maxLength = 16) ->
      result = ""
      # convert to milliseconds
      a = switch unit
        when "milliseconds" then v
        when "microseconds" then Math.floor(v / 1000)
        when "seconds" then v * 1000
        else 0

      addPart = (b, unit) ->
        if (a >= b)
          if (result != "") then result += " "
          result += Math.floor(a / b) + " " + unit
          a = a % b

      addPart(86400000, "d")
      if (result.length + 4 <= maxLength)
        addPart(3600000, "h")
        if (result.length + 7 <= maxLength)
          addPart(60000, "min")
          if (result.length + 4 <= maxLength)
            addPart(1000, "s")

      if (result == "")
        result = ("" + a + " ms")

      result

    formatTime: (date, seconds = true, milliseconds = true, UTC = false) ->
      if not date? then return ""
      if not date.getUTCFullYear? then date = new Date(date)
      part = (x, numberOfDigits = 2) ->
        str = "" + x
        if (numberOfDigits >= 3 and x < 100) then str = "0" + str
        if (numberOfDigits >= 2 and x < 10) then str = "0" + str
        str

      result = ""
      result += part(if UTC then date.getUTCHours() else date.getHours())
      result += ":"
      result += part(if UTC then date.getUTCMinutes() else date.getMinutes())
      if (seconds)
        result += ":"
        result += part(if UTC then date.getUTCSeconds() else date.getSeconds())
      if (seconds and milliseconds)
        result += ":"
        result += part((if UTC then date.getUTCMilliseconds() else date.getMilliseconds()), 3)
      result

    formatDate: (date, UTC = true) ->
      if not date? then return ""
      if not date.getUTCFullYear? then date = new Date(date)
      part = (x) ->
        str = "" + x
        if (x < 10) then str = "0" + str
        str

      result = ""
      result += part(if UTC then date.getUTCFullYear() else date.getFullYear())
      result += "-"
      result += part(if UTC then (date.getUTCMonth() + 1) else (date.getMonth() + 1))
      result += "-"
      result += part(if UTC then date.getUTCDate() else date.getDate())
      result

    formatTimestamp: (date, UTC = false) ->
      if not date? then return ""
      if not date.getUTCFullYear? then date = new Date(date)
      @formatDate(date, UTC) + " " + @formatTime(date, true, true, UTC)

    nanosToMillis: (nanos, decimals) ->
      (nanos / 1000000).toFixed(decimals)

  new Format()
