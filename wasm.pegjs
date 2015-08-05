{
  // HACK
  var wast = options.wast;

  function buildList(first, rest) {
    return [first].concat(rest);
  }

  function buildBinaryExpr(first, rest) {
    var e = first;
    for (var i in rest) {
      e = wast.InfixOp({
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

  // Line 1 indexed, column 0 indexed.
  function getPos() {
    return {line: line(), column: column() - 1};
  }
}

start = module

whitespace "whitespace" = [ \t\r\n]

comment "comment" = "//" [^\n]*

S = (whitespace / comment)*

EOT = ![a-zA-Z0-9_]

keyword = ("if" / "func" / "memory" / "return" / "export" / "import" / "var" / "align" / "config" / "switch" / "case" / "default" / "while" / "loop" / "break") EOT

identText = $([a-zA-Z_][a-zA-Z0-9_]*)

ident "identifier" = !keyword text: identText {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

mtypeU = "I32" {return "i32";} / "I64" {return "i64";} / "F32" {return "f32";} / "F64" {return "f64";} / "I8" {return "i8";} / "I16" {return "i16";}

mtypeL = "i32" {return "i32";} / "i64" {return "i64";} / "f32" {return "f32";} / "f64" {return "f64";} / "i8" {return "i8";} / "i16" {return "i16";}


loadExpr
  = "load" t:mtypeU S "(" S addr:expr S ")" {
    return wast.Load({
      mtype: t,
      address: addr,
      pos: getPos(),
    });
  }

storeExpr
  = "store" t:mtypeU S "(" S addr:expr S "," S value:expr S ")" {
    return wast.Store({
      mtype: t,
      address: addr,
      value: value,
      pos: getPos(),
    });
  }

coerceExpr
  = t:mtypeL S "(" S expr:expr S ")" {
    return wast.Coerce({
      mtype: t,
      expr: expr,
      pos: getPos(),
    });
  }


number "number" = digits:$([0-9]+) {
       return +digits;
}

hexDigit "hex digit" = [0-9a-fA-F]

constant
  = "0x" digits:$(hexDigit+) {
    return wast.ConstI32({
      value: parseInt(digits, 16),
      pos: getPos(),
    });
  }
  / digits:($([0-9]+ "." [0-9]*)) "f" {
    return wast.ConstF32({
      value: Math.fround(+digits),
      pos: getPos(),
    })
  }
  / digits:($([0-9]+ "." [0-9]*)) {
    return wast.ConstF64({
      value: +digits,
      pos: getPos(),
    })
  }
  / n:number {
    return wast.ConstI32({
      value: n,
      pos: getPos(),
    })
  }

indirectCall = ftype:funcType S "(" S expr:expr S ")" S "(" S args:exprList S ")" {
  return wast.CallIndirect({
    ftype: ftype,
    expr: expr,
    args: args,
    pos: getPos(),
  });
}

atom
  = constant
  / indirectCall
  / "(" S e:expr S ")" {return e;}
  / loadExpr
  / storeExpr
  / coerceExpr
  / name:ident {return wast.GetName({name: name})}

callExpr = first:atom rest:(S "(" S args:exprList S ")" {return args;})* {return buildCallExpr(first, rest);}

prefixExpr = op:("!"/"~"/"+"/"-") S expr:prefixExpr {return wast.PrefixOp({op: op, expr: expr, pos: getPos()});} / callExpr

mulOp = text:$("*"/"/"/"%") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

mulExpr = first:prefixExpr rest:(S mulOp S prefixExpr)* {return buildBinaryExpr(first, rest);}

addOp = text:$("+"/"-") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

addExpr = first:mulExpr rest:(S addOp S mulExpr)* {return buildBinaryExpr(first, rest);}

shiftOp = text:$("<<"/">>"/">>>") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

shiftExpr = first:addExpr rest:(S shiftOp S addExpr)* {return buildBinaryExpr(first, rest);}

compareOp = text:$("<="/"<"/">="/">") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

compareExpr = first:shiftExpr rest:(S compareOp S shiftExpr)* {return buildBinaryExpr(first, rest);}

equalOp = text:$("=="/"!=") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

equalExpr = first:compareExpr rest:(S equalOp S compareExpr)* {return buildBinaryExpr(first, rest);}

bitwiseAndOp = text:$("&") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

bitwiseAndExpr = first:equalExpr rest:(S bitwiseAndOp S equalExpr)* {return buildBinaryExpr(first, rest);}

bitwiseXorOp = text:$("^") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

bitwiseXorExpr = first:bitwiseAndExpr rest:(S bitwiseXorOp S bitwiseAndExpr)* {return buildBinaryExpr(first, rest);}

bitwiseOrOp = text:$("|") {
  return wast.Identifier({
    text: text,
    pos: getPos(),
  });
}

bitwiseOrExpr = first:bitwiseXorExpr rest:(S bitwiseOrOp S bitwiseXorExpr)* {return buildBinaryExpr(first, rest);}

expr = bitwiseOrExpr

exprList = (first:expr rest:(S "," S e:expr {return e;})* {return buildList(first, rest);} / {return [];} )

stmt
  = s:(
    ("if" EOT S "(" S cond:expr S ")"
      S "{" S t:body S "}"
      f:(S "else" S "{" S f:body S "}" {return f;} / {return null;}) {
      return wast.If({
        cond:cond,
        t: t,
	f: f,
	pos: getPos(),
      });
    })
    /("while" EOT S "(" S cond:expr S ")"
      S "{" S b:body S "}" {
      return wast.While({
        cond:cond,
        body: b,
	pos: getPos(),
      });
    })
    /("loop" EOT
      S "{" S b:body S "}" {
      return wast.Loop({
        body: b,
      });
    })
    /("return" EOT S e:(expr/{return null}) S ";" {
      return wast.Return({
        expr: e,
	pos: getPos(),
      });
    })
    / ("var" EOT S name:ident S type:typeRef
       value:(S "=" S e:expr {return e;} / {return null;}) S ";" {
      return wast.VarDecl({
        name: name,
        vtype: type,
        value: value,
	pos: getPos(),
      });
    })
    / ("break" EOT S name:ident S ";" {
      return wast.BreakToLabel({
        name: name,
      });
    })
    / (name:ident S ":" S stmt:stmt {
      return wast.Label({
        name: name,
        stmt: stmt
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

typeRef = name:ident {
  return wast.TypeName({name: name});
}

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
    pos: getPos(),
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

funcType =  "(" S params:typeList S ")" S r:returnType {
  return wast.FuncType({
    paramTypes: params,
    returnType: r,
  });
}

import = "import" EOT S "func" EOT S name:ident S ftype:funcType S ";" {
  return wast.Extern({
    name: name,
    ftype: ftype,
    pos: getPos(),
  });
}

tls = "tls" EOT S name:ident S t:typeRef S ";" {
  return wast.TlsDecl({
    name: name,
    mtype: t,
  });
}

memoryAlign = "align" EOT S size:number S ";" {
  return wast.MemoryAlign({size: size})
}

memoryLabel = name:ident S ":" {
  return wast.MemoryLabel({name: name})
}

memoryZero = "zero" EOT S size:number S ";" {
  return wast.MemoryZero({size: size})
}

hexByte = text:$(hexDigit hexDigit) {return parseInt(text, 16);}

hexData = (first:hexByte rest:(S d:hexByte {return d;})* {return buildList(first, rest);}) / {return [];}

memoryHex = "hex" EOT S data:hexData S ";" {return wast.MemoryHex({data: data});}

stringByte = text:("\\" '"' {return '"';} / $[^\\"] ) {return text.charCodeAt(0);}

stringData = (first:stringByte rest:(d:stringByte {return d;})* {return buildList(first, rest).concat([0]);}) / {return [0];}

// HACK desugar to MemoryHex
memoryString = "string" EOT S '"' data:stringData '"' S ";" {return wast.MemoryHex({data: data});}

memoryDirective = memoryAlign / memoryZero / memoryHex / memoryString / memoryLabel

memoryDirectiveList = (first:memoryDirective rest:(S d:memoryDirective {return d;})* {return buildList(first, rest);}) / {return [];}

memoryDecl = "memory" EOT S "{" S d:memoryDirectiveList S "}" {
  return wast.MemoryDecl({
    directives: d,
  });
}

decl = funcdecl / import / memoryDecl / tls / config

declList = (first:decl rest:(S d:decl {return d;})* {return buildList(first, rest);}) / {return [];}

module = S decls:declList S {
  return wast.ParsedModule({
    decls: decls,
  })
}