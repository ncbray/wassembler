define(['astutil'], function(astutil) {
  var schema =[
    {
      name: "ConstI32",
      type: "const_i32",
      fields: [
	{name: "value"},
      ],
    },
    {
      name: "ConstF32",
      type: "const_f32",
      fields: [
	{name: "value"},
      ],
    },
    {
      name: "Identifier",
      type: "identifier",
      fields: [
	{name: "text"},
	{name: "pos"},
      ],
    },
    {
      name: "GetName",
      type: "getname",
      fields: [
	{name: "name"},
      ],
    },
    {
      name: "GetFunction",
      type: "getfunction",
      fields: [
	{name: "index"},
      ],
    },
    {
      name: "GetExtern",
      type: "getextern",
      fields: [
	{name: "index"},
      ],
    },
    {
      name: "GetLocal",
      type: "getlocal",
      fields: [
	{name: "index"},
      ],
    },
    {
      name: "Load",
      type: "load",
      fields: [
	{name: "mtype"},
	{name: "address"},
      ],
    },
    {
      name: "Store",
      type: "store",
      fields: [
	{name: "mtype"},
	{name: "address"},
	{name: "value"},
      ],
    },
    {
      name: "BinaryOp",
      type: "binop",
      fields: [
	{name: "left"},
	{name: "op"},
	{name: "right"},
      ],
    },
    {
      name: "Call",
      type: "call",
      fields: [
	{name: "expr"},
	{name: "args"},
      ],
    },
    {
      name: "CallDirect",
      type: "calldirect",
      fields: [
	{name: "func"},
	{name: "args"},
      ],
    },
    {
      name: "CallExternal",
      type: "callexternal",
      fields: [
	{name: "func"},
	{name: "args"},
      ],
    },
    {
      name: "Return",
      type: "return",
      fields: [
	{name: "expr"},
      ],
    },
    {
      name: "If",
      type: "if",
      fields: [
	{name: "cond"},
	{name: "t"},
	{name: "f"},
      ],
    },
    {
      name: "Param",
      type: "param",
      fields: [
	{name: "name"},
	{name: "ptype"},
      ],
    },
    {
      name: "Local",
      type: "local",
      fields: [
	{name: "name"},
	{name: "ltype"},
	{name: "index"},
      ],
    },
    {
      name: "Function",
      type: "function",
      fields: [
	{name: "exportFunc"},
	{name: "name"},
	{name: "params"},
	{name: "returnType"},
	{name: "locals"},
	{name: "body"},
      ],
    },
    {
      name: "Extern",
      type: "extern",
      fields: [
	{name: "name"},
	{name: "args"},
	{name: "returnType"},
      ],
    },
    {
      name: "Module",
      type: "module",
      fields: [
	{name: "externs"},
	{name: "funcs"},
      ],
    },
  ];

  return astutil.makeASTBuilder(schema);
});
