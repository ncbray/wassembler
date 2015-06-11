start = module

S "whitespace" = [ \t\r\n]*

EOT = ![a-zA-Z0-9_]

ident "identifier" = letters:[a-zA-Z0-9_]+ {return letters.join("")}

atom = digits:$[0-9]+ {return wasm.ConstI32({value: +digits})}

expr = atom

stmt = s:("return" EOT S e:(expr/{return null}) {
  return wasm.Return({
    expr: e
  });
}) S ";" {return s}

body = stmt+

returnType = ident

funcdecl = "func" EOT S name:ident S "(" S ")" S returnType:returnType S "{" S body:body S "}" {
  return wasm.Function({
    name: name,
    argCount: 0,
    exportFunc: true,
    locals: [],
    returnType: returnType,
    body: body,
  })
}

module = funcs:funcdecl+ {
  return wasm.Module({
    externs: [],
    funcs: funcs,
  })
}