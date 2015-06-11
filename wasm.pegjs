start = module

S "whitespace" = [ \t\r\n]*

EOT = ![a-zA-Z0-9_]

ident "identifier" = $[a-zA-Z0-9_]+

atom = digits:$[0-9]+ {return wasm.ConstI32({value: +digits})}

expr = atom

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