{
  function buildBinaryExpr(first, rest) {
    var e = first;
    for (var i in rest) {
      e = wasm.BinaryOp({
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
      e = wasm.Call({
        expr: e,
	args: [],
      });
    }
    return e;
  }

}

start = module

S "whitespace" = [ \t\r\n]*

EOT = ![a-zA-Z0-9_]

ident "identifier" = $[a-zA-Z0-9_]+

atom
  = digits:$[0-9]+ {return wasm.ConstI32({value: +digits})}
  / "(" S e:expr S ")" {return e;}
  / name:ident {return wasm.GetName({name: name})}

callOp = first:atom rest:(S "(" S ")")* {return buildCallExpr(first, rest);}

mulOp = first:callOp rest:(S $("*"/"/"/"%") S callOp)* {return buildBinaryExpr(first, rest);}

addOp = first:mulOp rest:(S $("+"/"-") S mulOp)* {return buildBinaryExpr(first, rest);}

shiftOp = first:addOp rest:(S $("<<"/">>"/">>>") S addOp)* {return buildBinaryExpr(first, rest);}

compareOp = first:shiftOp rest:(S $("<="/"<"/">="/">") S shiftOp)* {return buildBinaryExpr(first, rest);}

equalOp = first:compareOp rest:(S $("=="/"!=") S compareOp)* {return buildBinaryExpr(first, rest);}

expr = equalOp

stmt = s:("return" EOT S e:(expr/{return null}) {
  return wasm.Return({
    expr: e
  });
}) S ";" {return s}

body = (S stmt:stmt {return stmt})*

returnType = ident

optionalExport = "export" EOT {return true} / {return false}

funcdecl = e:optionalExport S "func" EOT S name:ident S "(" S ")" S returnType:returnType S "{" S body:body S "}" {
  return wasm.Function({
    name: name,
    argCount: 0,
    exportFunc: e,
    locals: [],
    returnType: returnType,
    body: body,
  })
}

module = funcs:(S f:funcdecl {return f})* S {
  return wasm.Module({
    externs: [],
    funcs: funcs,
  })
}