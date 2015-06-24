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

keyword = ("if" / "func" / "memory" / "return" / "export" / "import" / "var") EOT

identText = $([a-zA-Z_][a-zA-Z0-9_]*)

ident "identifier" = !keyword text: identText {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

mtypeU = "I32" {return "i32";} / "F32" {return "f32";} / "F64" {return "f64";} / "I8" {return "i8";} / "I16" {return "i16";}

mtypeL = "i32" {return "i32";} / "f32" {return "f32";} / "f64" {return "f64";} / "i8" {return "i8";} / "i16" {return "i16";}


loadOp
  = "load" t:mtypeU S "(" S addr:expr S ")" {
    return wast.Load({
      mtype: t,
      address: addr
    });
  }

storeOp
  = "store" t:mtypeU S "(" S addr:expr S "," S value:expr S ")" {
    return wast.Store({
      mtype: t,
      address: addr,
      value: value
    });
  }

coerceOp
  = t:mtypeL S "(" S expr:expr S ")" {
    return wast.Coerce({
      mtype: t,
      expr: expr,
    });
  }


number "number" = digits:$([0-9]+) {
       return +digits;
}

constant
  = digits:($([0-9]+ "." [0-9]*)) "f" {return wast.ConstF32({value: Math.fround(+digits)})}
  / digits:($([0-9]+ "." [0-9]*)) {return wast.ConstF64({value: +digits})}
  / n:number {return wast.ConstI32({value: n})}

atom
  = constant
  / "(" S e:expr S ")" {return e;}
  / loadOp
  / storeOp
  / coerceOp
  / name:ident {return wast.GetName({name: name})}

callOp = first:atom rest:(S "(" S args:exprList S ")" {return args;})* {return buildCallExpr(first, rest);}

mulOp = first:callOp rest:(S $("*"/"/"/"%") S callOp)* {return buildBinaryExpr(first, rest);}

addOp = first:mulOp rest:(S $("+"/"-") S mulOp)* {return buildBinaryExpr(first, rest);}

shiftOp = first:addOp rest:(S $("<<"/">>"/">>>") S addOp)* {return buildBinaryExpr(first, rest);}

compareOp = first:shiftOp rest:(S $("<="/"<"/">="/">") S shiftOp)* {return buildBinaryExpr(first, rest);}

equalOp = first:compareOp rest:(S $("=="/"!=") S compareOp)* {return buildBinaryExpr(first, rest);}

bitwiseAndOp = first:equalOp rest:(S $("&") S equalOp)* {return buildBinaryExpr(first, rest);}

bitwiseXorOp = first:bitwiseAndOp rest:(S $("^") S bitwiseAndOp)* {return buildBinaryExpr(first, rest);}

bitwiseOrOp = first:bitwiseXorOp rest:(S $("|") S bitwiseXorOp)* {return buildBinaryExpr(first, rest);}

expr = bitwiseOrOp

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
    /("while" EOT S "(" S cond:expr S ")"
      S "{" S b:body S "}" {
      return wast.While({
        cond:cond,
        body: b
      });
    })
    /("return" EOT S e:(expr/{return null}) S ";" {
      return wast.Return({
        expr: e
      });
    })
    / ("var" EOT S name:ident S type:typeRef
       value:(S "=" S e:expr {return e;} / {return null;}) S ";" {
      return wast.VarDecl({
        name: name,
        vtype: type,
        value: value,
      });
    })
    / (name:ident S "=" S value:expr S ";" {
      return wast.SetName({
        name: name,
	value: value,
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

funcdecl = e:optionalExport S "func" EOT S name:ident S "(" S params:paramList S ")" S returnType:returnType S "{" S body:body S "}" {
  return wast.Function({
    exportFunc: e,
    name: name,
    params: params,
    returnType: returnType,
    locals: [],
    body: body,
  })
}

constExpr = constant

configItem = path:(first:identText rest:(S "." S i:identText {return i;})* {return buildList(first, rest);} / {return [];} ) S ":" S value: constExpr {
  return wast.ConfigItem({
    path: path,
    value: value
  })
}

configItemList = (first:configItem rest:(S "," S i:configItem {return i;})* {return buildList(first, rest);} / {return [];} )

config = "config" EOT S "{" S items:configItemList S "}" {
  return wast.ConfigDecl({
    items:items
  })
}

typeList = (first:typeRef rest:(S "," S t:typeRef {return t;})* {return buildList(first, rest);} / {return [];} )

import = "import" EOT S "func" EOT S name:ident S "(" S args:typeList S ")" S r:returnType S ";" {
  return wast.Extern({
    name: name,
    args: args,
    returnType: r,
  });
}

memorydecl = "memory" EOT S name:ident S size:number S "align" EOT S align:number ";" {
  return wast.MemoryDecl({
    name: name,
    size: size,
    align: align,
  });
}

decl = funcdecl / import / memorydecl / config

declList = (first:decl rest:(S d:decl {return d;})* {return buildList(first, rest);}) / {return [];}

module = S decls:declList S {
  return wast.ParsedModule({
    decls: decls,
  })
}