# WASM Assembler

This is a quick and dirty prototype for turning a textual language into JS and/or bytecode.

## Developing

Running `./tools/httpd.py` will serve the current directory at http://localhost:7777/

## Design

### Goals

* Human-understandable text can be recovered from bytecode.
* A complete program can be specified in a single file.

### Non-goals

* Hand writing large amounts of textual WASM.
* Inline assembly.  Textual WASM can be compiled and linked into a C program, instead.

### Design Questions

* Goto / CFG support.  High-level?  Low-level?
* Low-level support for i8 and i16?
  * What's the overall size and performance cost of emulating i8 operations in terms of i32?
* Unsigned types?
  * Textual representations for signed vs. unsigned div/mod/shift/compare?
  * Signed vs. unsigned matters when calling into JS.  Pass all values as signed, require JS to convert to unsigned?
  * LLVM elides signed / unsigned from the type system, recovering it would be annoying.

### Compiler Pipeline

parse => semantic pass => desugar => backend

* parse: translate the textual format into an AST.
* semantic pass: resolve names and check types.
* desugar: convert user-friendly “sugar” into concepts that can be directly represented in the bytecode.  For example converting i8 types into i32 types.
* backend: generate JS or bytecode.

## TODO

### Short Term

* Indirect function calls.
* Thread-local globals.
* i64.

### Long Term

* Shared memory and threads.
* Dynamic linking.
