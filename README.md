# WASM Assembler

This is a quick and dirty prototype for turning a textual language into JS and/or bytecode.

## Developing

Running `./tools/httpd.py` will serve the current directory at http://localhost:7777/

## Design

### Design Goals

* Human-understandable text can be recovered from bytecode.
* A complete program can be specified in a single file.

### Compiler Pipeline

parse => semantic pass => lower => backend

* parse: translate the textual format into an AST.
* semantic pass: resolve names and check types.
* lower: convert user-friendly “sugar” into concepts that can be directly represented in the bytecode.  For example converting i8 types into i32 types.
* backend: generate JS or bytecode.

### Design Questions

* Low-level support for i8 and i16?
  * What's the overall size and performance cost of emulating i8 operations in terms of i32?
* Low-level support for unsigned types?
  * Signed vs. unsigned matters when calling into JS.
  * LLVM elides signed / unsigned from the type system, recovering it would be annoying.
  * How would signed vs. unsigned div/mod/shift/compare be represented, textually?
* Goto / CFG support.  High-level?  Low-level?

## TODO

### Short Term

* Indirect function calls.
* Memory initializers.
* Thread-local globals.
* i64.

### Long Term

* Shared memory.
* Dynamic linking.
