define(['astutil'], function(astutil) {
  var schema =[
    {
      name: "ConstI32",
      fields: [
	{name: "value"},
	{name: "pos"},
      ],
    },
    {
      name: "ConstF32",
      fields: [
	{name: "value"},
	{name: "pos"},
      ],
    },
    {
      name: "ConstF64",
      fields: [
	{name: "value"},
	{name: "pos"},
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
	{name: "pos"},
      ],
    },
    {
      name: "GetExtern",
      fields: [
	{name: "index"},
	{name: "pos"},
      ],
    },
    {
      name: "GetLocal",
      fields: [
	{name: "index"},
	{name: "pos"},
      ],
    },
    {
      name: "SetLocal",
      fields: [
	{name: "index"},
	{name: "value"},
	{name: "pos"},
      ],
    },
    {
      name: "Load",
      fields: [
	{name: "mtype"},
	{name: "address"},
	{name: "pos"},
      ],
    },
    {
      name: "Store",
      fields: [
	{name: "mtype"},
	{name: "address"},
	{name: "value"},
	{name: "pos"},
      ],
    },
    {
      name: "Coerce",
      fields: [
	{name: "mtype"},
	{name: "expr"},
	{name: "pos"},
      ],
    },
    {
      name: "PrefixOp",
      fields: [
	{name: "op"},
	{name: "expr"},
	{name: "pos"},
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
	{name: "pos"},
      ],
    },
    {
      name: "CallExternal",
      fields: [
	{name: "func"},
	{name: "args"},
	{name: "pos"},
      ],
    },
    {
      name: "VarDecl",
      fields: [
	{name: "name"},
	{name: "vtype"},
	{name: "value"},
	{name: "pos"},
      ],
    },
    {
      name: "Return",
      fields: [
	{name: "expr"},
	{name: "pos"},
      ],
    },
    {
      name: "Break",
      fields: [
	{name: "pos"},
      ],
    },
    {
      name: "If",
      fields: [
	{name: "cond"},
	{name: "t"},
	{name: "f"},
	{name: "pos"},
      ],
    },
    {
      name: "While",
      fields: [
	{name: "cond"},
	{name: "body"},
	{name: "pos"},
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
	{name: "pos"},
      ],
    },
    {
      name: "Extern",
      fields: [
	{name: "name"},
	{name: "args"},
	{name: "returnType"},
	{name: "pos"},
      ],
    },
    {
      name: "MemoryAlign",
      fields: [
	{name: "size"},
      ],
    },
    {
      name: "MemoryLabel",
      fields: [
	{name: "name"},
      ],
    },
    {
      name: "MemoryZero",
      fields: [
	{name: "size"},
      ],
    },
    {
      name: "MemoryHex",
      fields: [
	{name: "data"},
      ],
    },
    {
      name: "MemoryDecl",
      fields: [
	{name: "directives"},
      ],
    },
    {
      name: "ConfigItem",
      fields: [
	{name: "path"},
	{name: "value"},
      ],
    },
    {
      name: "ConfigDecl",
      fields: [
	{name: "items"},
      ],
    },
    {
      name: "Module",
      fields: [
	{name: "config"},
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
