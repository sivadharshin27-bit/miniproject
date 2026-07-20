const fs = require('fs');

const path = 'src/app/data/default_questions.json';
const questions = JSON.parse(fs.readFileSync(path, 'utf8'));

const mcqs = {
  c: [
    { question: "[C] What is the size of an int data type in 32-bit systems?", options: ["2 bytes", "4 bytes", "8 bytes", "Depends on compiler"], correctAnswer: 1 },
    { question: "[C] Which of the following is not a valid C variable name?", options: ["int number;", "float rate;", "int variable_count;", "int $main;"], correctAnswer: 3 },
    { question: "[C] What does the 'malloc' function return if it fails to allocate memory?", options: ["NULL", "0", "Memory address", "Garbage value"], correctAnswer: 0 },
    { question: "[C] Which operator is used to get the memory address of a variable?", options: ["*", "&", "&&", "||"], correctAnswer: 1 },
    { question: "[C] What is the correct way to declare a pointer to an integer?", options: ["int *ptr;", "int ptr;", "pointer int ptr;", "int ptr*;"], correctAnswer: 0 },
    { question: "[C] Which library contains the 'printf' function?", options: ["<stdlib.h>", "<conio.h>", "<stdio.h>", "<math.h>"], correctAnswer: 2 },
    { question: "[C] In C, array indices start at what number?", options: ["1", "0", "-1", "Depends on array size"], correctAnswer: 1 },
    { question: "[C] What is the keyword used to define a constant variable in C?", options: ["constant", "const", "final", "static"], correctAnswer: 1 },
    { question: "[C] How do you comment a single line in C?", options: ["// comment", "/* comment */", "# comment", "-- comment"], correctAnswer: 0 },
    { question: "[C] What is the output of 3 + 2 * 5?", options: ["25", "13", "10", "15"], correctAnswer: 1 }
  ],
  cpp: [
    { question: "[C++] Which of the following is used for standard input in C++?", options: ["cin", "cout", "printf", "scanf"], correctAnswer: 0 },
    { question: "[C++] What does OOP stand for?", options: ["Object Oriented Programming", "Object Oriented Paradigm", "Object Origin Programming", "None of the above"], correctAnswer: 0 },
    { question: "[C++] Which symbol is used to define a class?", options: ["class", "struct", "object", "type"], correctAnswer: 0 },
    { question: "[C++] What is an inline function?", options: ["A function that calls itself", "A function defined inside another function", "A function that is expanded in line when it is called", "A function with no return type"], correctAnswer: 2 },
    { question: "[C++] Which operator cannot be overloaded in C++?", options: ["+", "-", "::", "*"], correctAnswer: 2 },
    { question: "[C++] What is a virtual function?", options: ["A function with no body", "A function that can be overridden in a derived class", "A static function", "A function defined outside a class"], correctAnswer: 1 },
    { question: "[C++] Which library is required for 'cout'?", options: ["<iostream>", "<stdio.h>", "<conio.h>", "<iomanip>"], correctAnswer: 0 },
    { question: "[C++] What is the default access specifier in a class?", options: ["public", "protected", "private", "default"], correctAnswer: 2 },
    { question: "[C++] What is a constructor?", options: ["A normal function", "A function used to destroy objects", "A special member function automatically called when an object is created", "A variable"], correctAnswer: 2 },
    { question: "[C++] Which keyword is used for dynamic memory allocation in C++?", options: ["malloc", "new", "alloc", "create"], correctAnswer: 1 }
  ],
  java: [
    { question: "[Java] Which of the following is not a Java keyword?", options: ["static", "Boolean", "void", "private"], correctAnswer: 1 },
    { question: "[Java] What is the extension of compiled Java classes?", options: [".txt", ".js", ".class", ".java"], correctAnswer: 2 },
    { question: "[Java] Which method is the entry point of a Java program?", options: ["start()", "main()", "run()", "init()"], correctAnswer: 1 },
    { question: "[Java] What is the size of an int variable in Java?", options: ["8 bit", "16 bit", "32 bit", "64 bit"], correctAnswer: 2 },
    { question: "[Java] Which keyword is used to inherit a class in Java?", options: ["implements", "extends", "inherits", "super"], correctAnswer: 1 },
    { question: "[Java] What is used to find and fix bugs in Java programs?", options: ["JVM", "JRE", "JDK", "JDB"], correctAnswer: 3 },
    { question: "[Java] Which of these cannot be used for a variable name in Java?", options: ["identifier", "keyword", "letter", "number"], correctAnswer: 1 },
    { question: "[Java] What is the default value of a local variable?", options: ["null", "0", "Depends on data type", "Not assigned/Compilation Error"], correctAnswer: 3 },
    { question: "[Java] Which block is always executed whether an exception is handled or not?", options: ["try", "catch", "finally", "throw"], correctAnswer: 2 },
    { question: "[Java] Which collection class allows you to associate its elements with key values?", options: ["java.util.Set", "java.util.List", "java.util.Map", "java.util.Collection"], correctAnswer: 2 }
  ],
  python: [
    { question: "[Python] Which of the following is correct to print 'Hello' in Python 3?", options: ["print 'Hello'", "echo 'Hello'", "print('Hello')", "printf('Hello')"], correctAnswer: 2 },
    { question: "[Python] How do you insert comments in Python?", options: ["// comment", "/* comment */", "# comment", "<!-- comment -->"], correctAnswer: 2 },
    { question: "[Python] Which one is NOT a legal variable name?", options: ["my_var", "_myvar", "my-var", "myvar"], correctAnswer: 2 },
    { question: "[Python] What is the correct file extension for Python files?", options: [".pt", ".pyth", ".pyt", ".py"], correctAnswer: 3 },
    { question: "[Python] How do you create a variable with the numeric value 5?", options: ["x = int(5)", "x = 5", "Both are correct", "None are correct"], correctAnswer: 2 },
    { question: "[Python] What is the correct syntax to output the type of a variable or object in Python?", options: ["print(typeof(x))", "print(typeOf(x))", "print(type(x))", "print(typeof x)"], correctAnswer: 2 },
    { question: "[Python] Which method can be used to remove any whitespace from both the beginning and the end of a string?", options: ["strip()", "trim()", "ptrim()", "len()"], correctAnswer: 0 },
    { question: "[Python] Which collection is ordered, changeable, and allows duplicate members?", options: ["Dictionary", "Tuple", "List", "Set"], correctAnswer: 2 },
    { question: "[Python] How do you start a function in Python?", options: ["function myfunction():", "def myfunction():", "create myfunction():", "def myfunction:"], correctAnswer: 1 },
    { question: "[Python] Which keyword is used to create a class in Python?", options: ["class", "def", "struct", "object"], correctAnswer: 0 }
  ]
};

questions.forEach(q => {
  const lang = q.language || 'c';
  const newVivas = mcqs[lang] || mcqs['c'];
  q.vivas = newVivas.map((v, i) => ({
    id: i + 1,
    question: v.question,
    options: v.options,
    correctAnswer: v.correctAnswer
  }));
});

fs.writeFileSync(path, JSON.stringify(questions, null, 2));
console.log('Successfully populated 10 real MCQs for all questions.');
