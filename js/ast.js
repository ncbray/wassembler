define(["astutil"], function(astutil) {
  var schema = [
    {
      name: "ConstNum",
      fields: [
        {name: "value"},
      ],
    },
    {
      name: "GetName",
      fields: [
        {name: "name"},
      ],
    },
    {
      name: "GetAttr",
      fields: [
        {name: "expr"},
        {name: "attr"},
      ],
    },
    {
      name: "GetIndex",
      fields: [
        {name: "expr"},
        {name: "index"},
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
      name: "PrefixOp",
      fields: [
        {name: "op"},
        {name: "expr"},
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
      name: "New",
      fields: [
        {name: "expr"},
        {name: "args"},
      ],
    },
    {
      name: "CreateArray",
      fields: [
        {name: "args"},
      ],
    },
    {
      name: "KeyValue",
      fields: [
        {name: "key"},
        {name: "value"},
      ],
    },
    {
      name: "CreateObject",
      fields: [
        {name: "args"},
      ],
    },
    {
      name: "Assign",
      fields: [
        {name: "target"},
        {name: "value"},
      ],
    },
    {
      name: "Label",
      fields: [
        {name: "name"},
        {name: "stmt"},
      ],
    },
    {
      name: "Break",
      fields: [
        {name: "name"},
      ],
    },
    {
      name: "Return",
      fields: [
        {name: "expr"},
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
      name: "VarDecl",
      fields: [
        {name: "name"},
        {name: "expr"},
      ],
    },
    {
      name: "FunctionExpr",
      fields: [
        {name: "params"},
        {name: "body"},
      ],
    },
    {
      name: "InjectSource",
      fields: [
        {name: "source"},
      ],
    },
  ];

  return astutil.makeASTBuilder(schema);
});
