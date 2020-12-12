# Math-parser Respository   

This repository contains `math-parser`, a javascript-based parser for math expressions designed for use in `doenet`.  The code is written in Typescript, with its source in the `ts` directory, and output in the `js` directory.

## Installation

To install `math-parser`, clone the repository and then do

```
npm install
npm run compile
```

in the cloned directory.  This will install the needed packages and compile the Typescript code.

The `ts/main.ts` file is an example file that loads the parser and uses it to parse a math expression passed to it on the command line.  It outputs the result in several formats, including the JSON version of the internal AST tree, a translation of that AST to the doenet array format, and a stringified version of the AST that should be equivalent to the original expression.

## Calling the math-parser

To run it use

```
node -r esm js/main.js 'math-expression'
```

where `math-expression` is replaced by the expression to parse.  For example,

```
node -r esm js/main.js 'sin -x^2'
```

produces the output

```
{
  kind: 'FuncApply',
  value: 'sin',
  childNodes: [ { kind: 'Uop', value: '-', childNodes: [Array], precedence: 3 } ],
  associativity: 'right',
  precedence: 3.5,
  isComma: false,
  equalParens: false,
  opString: null,
  autoApply: true
}
[ 'sin', [ '-', [ '^', 'x', 2 ] ] ]
sin(-x^2)
```

The `ts/main.ts` file includes comments that explain how to set up the parser and call it, and to use the `ts/ArrayVisitor.ts` to convert the math-parser AST to the doenet array format.  (This is just a rough translation, as an example of an `AstVisitor` object.  It probably needs tweaking to be fully compatible.)

The main code is divided into several subdirectories.  The `token` directory has the definitions of the parse token classes that are used to manage the parsing of the math string, and the `ast` directory contains the definitions of the classes for the internal AST nodes.  The remaining files are the parser and parse stack code, the array visitor, and the bas `AstVisitor` class.

## Customization

The `math-parser` is designed to be customizable at several different levels.  The first is by allowing you to add only the parse tokens that you want, so that, for example, if you are asking about the value of `sin(3pi/4)`, you might not want to allow the use of the trigonometric functions, so you can leave those out.

You can add new tokens based on the existing ones, so that if you want to use `;` as a list separator, you could tie the semi-colon to the class that is used by the comma.  Most classes have properties (like the strings that are allowed, or the precedence of operators, and so on) that can be overridden to customize the actions of the parser.

At a deeper level, you can add your own token classes (usually as subclasses of the existing ones) to implement features that aren't currently available in the parser.  You can override the classes used by the parser to use your modified versions, or add completely new tokens to the parser.  
