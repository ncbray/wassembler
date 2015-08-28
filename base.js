define(
    ["wasm/ast", "wasm/semantic", "wasm/dce", "wasm/tojs", "js/backend"],
  function(wast, semantic, dce, tojs, js_backend) {

  // Promisified XMLHttpRequest.
  var getURL = function(url) {
    return new Promise(function(resolve, reject) {
      var req = new XMLHttpRequest();
      req.onload = function() {
        if (req.status == 200) {
          resolve(req.response);
        } else {
          reject(Error("getURL " + url + " - reponse " + req.status));
        }
      };
      req.onerror = function() {
        reject(Error("getURL " + url + " - network error"));
      };
      req.open("get", url);
      req.send();
    });
  };

  var createParser = function(grammar, status) {
    var parser = null;
    try {
      parser = PEG.buildParser(grammar);
    } catch (e) {
      status.error(e.message, e);
    }
    return parser;
  };

  // Scrape a parsed module the the names of the externs it declares.
  // This is used to infer which externs are provided by the system.
  var getExternNames = function(module) {
    var names = [];
    for (var i = 0; i < module.decls.length; i++) {
      var decl = module.decls[i];
      if (decl.type == "Extern") {
        names.push(decl.name.text);
      }
    }
    return names;
  };

  var parse = function(text, parser, status) {
    var result = null;
    try {
      result = parser.parse(text, {wast: wast});
    } catch (e) {
      status.error(e.message, e);
    }
    return result;
  };

  var frontend = function(systemWASMSrc, filename, text, parser, status, reportAST) {
    status.setFilename("system.wasm");
    var system = parse(systemWASMSrc, parser, status);
    if (status.num_errors > 0) {
      return null;
    }

    var system_externs = getExternNames(system);

    status.setFilename(filename);
    var parsed = parse(text, parser, status);
    if (status.num_errors > 0) {
      return null;
    }

    parsed = wast.ParsedModule({
      decls: system.decls.concat(parsed.decls),
    });

    if (reportAST) reportAST(parsed);

    var module = semantic.processModule(parsed, status);
    if (status.num_errors > 0) {
      return null;
    }
    status.setFilename("");

    if (reportAST) reportAST(module);

    module = dce.process(module);

    if (reportAST) reportAST(module);

    // HACK
    module.system_externs = system_externs;

    return module;
  };

  var astToJSSrc = function(module, systemJSSrc, config) {
    var translated = tojs.translate(module, systemJSSrc, config.use_shared_memory);
    var src = js_backend.generateExpr(translated) + "()";
    return src;
  };

  // Eval JS src, but convert any errors into a compiler error.
  var evalJSSrc = function(src, status) {
    // Compile the module. (Does not bind.)
    try {
      return eval(src);
    } catch (e) {
      status.error("JS compile - " + e.message);
      return null;
    }
  };

  var astToCompiledJS = function(module, systemJSSrc, config, status, reportSrc) {
    var src = astToJSSrc(module, systemJSSrc, config);
    if (reportSrc) reportSrc(src);
    return evalJSSrc(src, status);
  }

  // Display errors and keep track if any error have occured.
  var Status = function(logger) {
    this.logger = logger;
    this.filename = "";
    this.num_errors = 0;
  };

  Status.prototype.setFilename = function(filename) {
    this.filename = filename
  };

  Status.prototype.error = function(message, pos) {
    var prefix = "ERROR";
    if (this.filename) {
      prefix += " " + this.filename;
    }
    if (pos != undefined) {
      prefix += " " + pos.line + ":" + pos.column;
    }
    prefix += ": ";
    this.logger(prefix + message);
    this.num_errors += 1;
  };

  return {
    getURL: getURL,
    createParser: createParser,
    frontend: frontend,
    astToJSSrc: astToJSSrc,
    evalJSSrc: evalJSSrc,
    astToCompiledJS: astToCompiledJS,
    Status: Status,
  };
});
