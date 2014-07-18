define(function() {

  var fakePages = {
    scala: {
      title: "Scala",
      isSection: true,
      pages: {
        "scala/uno": {
          title: "Uno",
          isDir: true
        },
        "scala/dos": {
          title: "Dos",
          isDir: true
        },
        "scala/tres": {
          title: "Tres",
          isDir: true
        },
        "scala/quatro": {
          title: "Quatro"
        },
        "scala/cinqo": {
          title: "Cinqo"
        }
      }
    },
    akka: {
      title: "Akka",
      isSection: true,
      pages: {
        "akka/uno": {
          title: "Uno",
          isDir: true
        },
        "akka/dos": {
          title: "Dos",
          isDir: true
        },
        "akka/tres": {
          title: "Tres",
          isDir: true
        },
        "akka/quatro": {
          title: "Quatro"
        },
        "akka/cinqo": {
          title: "Cinqo"
        }
      }
    },
    play: {
      title: "Play",
      isSection: true,
      pages: {
        "play/uno": {
          title: "Uno",
          isDir: true
        },
        "play/dos": {
          title: "Dos",
          isDir: true
        },
        "play/tres": {
          title: "Tres",
          isDir: true
        },
        "play/quatro": {
          title: "Quatro"
        },
        "play/cinqo": {
          title: "Cinqo"
        }
      }
    },
    slick: {
      title: "Slick",
      isSection: true,
      pages: {
        "slick/uno": {
          title: "Uno",
          isDir: true
        },
        "slick/dos": {
          title: "Dos",
          isDir: true
        },
        "slick/tres": {
          title: "Tres",
          isDir: true
        },
        "slick/quatro": {
          title: "Quatro"
        },
        "slick/cinqo": {
          title: "Cinqo"
        }
      }
    },
    sbt: {
      title: "sbt",
      isSection: true,
      pages: {
        "sbt/uno": {
          title: "Uno",
          isDir: true
        },
        "sbt/dos": {
          title: "Dos",
          isDir: true
        },
        "sbt/tres": {
          title: "Tres",
          isDir: true
        },
        "sbt/quatro": {
          title: "Quatro"
        },
        "sbt/cinqo": {
          title: "Cinqo"
        }
      }
    }
  }

  return {
    getSections: function(url) {
      if (!url) {
        return fakePages;
      } else {
        return fakePages[url].pages;
      }
    },
    getPage: function(url) {
      return {
        title: "documentation page: " + url,
        page: "  <p>You've just created a Scala application!  This is a basic \"Hello, World\"\n     application.   Let's look at the <a href=\"#code/src/main/scala/Hello.scala\"\n    class=\"shortcut\">src/main/scala/Hello.scala</a> file.</p>\n\n  <p>This file consists of a single object called <code>Hello</code>.  This\n     object defines a <code>main</code> method, which denotes that it can be run as a\n     standalone application.  Let's look into the definition of the main method:</p>\n<pre><code>def main(args: Array[String]): Unit = </code></pre>\n  <p> The method definition starts with the keyword \"<code>def</code>\".   This is used to define all\n     methods in scala.  After def comes the name of the method, in this case \"main\".</p>\n  <p>Following the name is the argument list, denoting input parameters to the method.  In\n     the case of the \"<code>main</code>\" method, it takes a single parameter called \"<code>args</code>\".\n     When the application is executed, any command line arguments will be bundled into an array \n     of string values (or \"<code>Array[String]</code>\") and passed into the \"<code>main</code>\" method.</p>\n  <p>Following the argument list is the return type of the method.  For main, this is \"<code>Unit</code>\" which\n     denotes \"uninteresting\" return type.   It is similar to the \"void\" type of Java/C/C++ in that we aren't\n     interesting in calling the \"<code>main</code>\" method for a return value.\n  <p>Following the return type is an \"<code>=</code>\" character and then the method implementation.\n     For the <code>Hello.main</code> method, the implementation is the following block of code:\n  </p>\n  <pre><code>{\nprintln(\"Hello, World\")\n}</code></pre>\n\n  <p>This block of code uses the <code>println</code> method to display the string\n     literal \"Hello, world!\" on the console.  We can see this output by\n     clicking on the <a class=\"shortcut\" href=\"#run\">Run</a> tab.\n  </p>"
      };
    }
  }
});
