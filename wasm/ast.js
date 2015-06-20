define(['astutil'], function(astutil) {
  var schema =[
    {
      name: "ConstI32",
      fields: [
	{name: "value"},
      ],
    },
    {
      name: "ConstF32",
      fields: [
	{name: "value"},
      ],
    },
    {
      name: "ConstF64",
      fields: [
	{name: "value"},
      ],
    },
    {
      name: "Identifier",
      fields: [
	{name: "text"},
	{name: "pos"},
      ],
    },
    {
      name: "GetName",
      fields: [
	{name: "name"},
      ],
    },
    {
      name: "SetName",
      fields: [
	{name: "name"},
	{name: "value"},
      ],
    },
    {
      name: "GetFunction",
      fields: [
	{name: "index"},
      ],
    },
    {
      name: "GetExtern",
      fields: [
	{name: "index"},
      ],
    },
    {
      name: "GetLocal",
      fields: [
	{name: "index"},
      ],
    },
    {
      name: "SetLocal",
      fields: [
	{name: "index"},
	{name: "value"},
      ],
    },
    {
      name: "Load",
      fields: [
	{name: "mtype"},
	{name: "address"},
      ],
    },
    {
      name: "Store",
      fields: [
	{name: "mtype"},
	{name: "address"},
	{name: "value"},
      ],
    },
    {
      name: "Coerce",
      fields: [
	{name: "mtype"},
	{name: "expr"},
      ],
    },
    {
      name: "PrefixOp",
      fields: [
	{name: "op"},
	{name: "expr"},
      ],
    },
    {
      name: "BinaryOp",
      fields: [
	{name: "left"},
	{name: "op"},
	{name: "right"},
      ],
    },
    {
      name: "Call",
      fields: [
	{name: "expr"},
	{name: "args"},
      ],
    },
    {
      name: "CallDirect",
      fields: [
	{name: "func"},
	{name: "args"},
      ],
    },
    {
      name: "CallExternal",
      fields: [
	{name: "func"},
	{name: "args"},
      ],
    },
    {
      name: "VarDecl",
      fields: [
	{name: "name"},
	{name: "vtype"},
	{name: "value"},
      ],
    },
    {
      name: "Return",
      fields: [
	{name: "expr"},
      ],
    },
    {
      name: "Break",
      fields: [
      ],
    },
    {
      name: "If",
      fields: [
	{name: "cond"},
	{name: "t"},
	{name: "f"},
      ],
    },
    {
      name: "While",
      fields: [
	{name: "cond"},
	{name: "body"},
      ],
    },
    {
      name: "Loop",
      fields: [
	{name: "body"},
      ],
    },
    {
      name: "Param",
      fields: [
	{name: "name"},
	{name: "ptype"},
      ],
    },
    {
      name: "Local",
      fields: [
	{name: "name"},
	{name: "ltype"},
	{name: "index"},
      ],
    },
    {
      name: "Function",
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
      fields: [
	{name: "name"},
	{name: "args"},
	{name: "returnType"},
      ],
    },
    {
      name: "MemoryDecl",
      fields: [
	{name: "name"},
	{name: "size"},
	{name: "align"},
      ],
    },
    {
      name: "Module",
      fields: [
	{name: "externs"},
	{name: "funcs"},
	{name: "memory"},
      ],
    },
    {
      name: "ParsedModule",
      fields: [
	{name: "decls"},
      ],
    },
  ];

  return astutil.makeASTBuilder(schema);
});
