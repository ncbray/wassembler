{
  // HACK
  var wast = options.wast;

  function buildList(first, rest) {
    return [first].concat(rest);
  }

  function buildBinaryExpr(first, rest) {
    var e = first;
    for (var i in rest) {
      e = wast.BinaryOp({
        left: e,
        op: rest[i][1],
	right: rest[i][3],
      });
    }
    return e;
  }

  function buildCallExpr(first, rest) {
    var e = first;
    for (var i in rest) {
      e = wast.Call({
        expr: e,
	args: rest[i],
      });
    }
    return e;
  }

  function getPos() {
    return {line: line(), column: column()};
  }
}

start = module

whitespace "whitespace" = [ \t\r\n]

comment "comment" = "//" [^\n]*

S = (whitespace / comment)*

EOT = ![a-zA-Z0-9_]

ident "identifier" = text:($[a-zA-Z0-9_]+) {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

loadOp
  = t:("loadI32" {return "i32"}) S "(" S addr:expr S ")" {
    return wast.Load({
      mtype: t,
      address: addr
    });
  }

storeOp
  = t:("storeI32" {return "i32"}) S "(" S addr:expr S "," S value:expr S ")" {
    return wast.Store({
      mtype: t,
      address: addr,
      value: value
    });
  }

constant
  = digits:($([0-9]+ "." [0-9]*)) "f" {return wast.ConstF32({value: Math.fround(+digits)})}
  / digits:($([0-9]+ "." [0-9]*)) {return wast.ConstF64({value: +digits})}
  / digits:$[0-9]+ {return wast.ConstI32({value: +digits})}

atom
  = constant
  / "(" S e:expr S ")" {return e;}
  / loadOp
  / storeOp
  / name:ident {return wast.GetName({name: name})}

callOp = first:atom rest:(S "(" S args:exprList S ")" {return args;})* {return buildCallExpr(first, rest);}

mulOp = first:callOp rest:(S $("*"/"/"/"%") S callOp)* {return buildBinaryExpr(first, rest);}

addOp = first:mulOp rest:(S $("+"/"-") S mulOp)* {return buildBinaryExpr(first, rest);}

shiftOp = first:addOp rest:(S $("<<"/">>"/">>>") S addOp)* {return buildBinaryExpr(first, rest);}

compareOp = first:shiftOp rest:(S $("<="/"<"/">="/">") S shiftOp)* {return buildBinaryExpr(first, rest);}

equalOp = first:compareOp rest:(S $("=="/"!=") S compareOp)* {return buildBinaryExpr(first, rest);}

expr = equalOp

exprList = (first:expr rest:(S "," S e:expr {return e;})* {return buildList(first, rest);} / {return [];} )

stmt
  = s:(
    ("if" EOT S "(" S cond:expr S ")"
      S "{" S t:body S "}"
      f:(S "else" S "{" S f:body S "}" {return f;} / {return null;}) {
      return wast.If({
        cond:cond,
        t: t,
	f: f
      });
    })
    /("return" EOT S e:(expr/{return null}) S ";" {
      return wast.Return({
        expr: e
      });
    })
    / e:expr S ";" {return e;}
  ) {return s}

body = (S stmt:stmt {return stmt})*

typeRef = ident

returnType = typeRef

optionalExport = "export" EOT {return true} / {return false}

param = name:ident S type:typeRef {
  return wast.Param({
    name: name,
    ptype: type
  });
}

paramList = (first:param rest:(S "," S p:param {return p;})* {return buildList(first, rest);} / {return [];} )

funcdecl "function decl" = e:optionalExport S "func" EOT S name:ident S "(" S params:paramList S ")" S returnType:returnType S "{" S body:body S "}" {
  return wast.Function({
    exportFunc: e,
    name: name,
    params: params,
    returnType: returnType,
    locals: [],
    body: body,
  })
}

typeList = (first:typeRef rest:(S "," S t:typeRef {return t;})* {return buildList(first, rest);} / {return [];} )

import "import decl" = "import" EOT S name:ident S "(" S args:typeList S ")" S r:returnType S ";" {
  return wast.Extern({
    name: name,
    args: args,
    returnType: r,
  });
}

memorydecl "memory decl" = "memory" EOT S name:ident S type:typeRef S ";" {
  return wast.MemoryDecl({
    name: name,
    mtype: type,
  });
}

decl = funcdecl / import / memorydecl

declList = (first:decl rest:(S d:decl {return d;})* {return buildList(first, rest);}) / {return [];}

module = S decls:declList S {
  return wast.ParsedModule({
    decls: decls,
  })
}