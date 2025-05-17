// Code templates for different programming languages
const codeTemplates = {
  javascript: `// JavaScript Template
console.log("Hello, World!");

// Example: Sum of two numbers
function sum(a, b) {
  return a + b;
}

// Read input
const input = process.argv[2] || "";
const [a, b] = input.split(" ").map(Number);

// Print result
console.log(sum(a, b));`,

  typescript: `// TypeScript Template
console.log("Hello, World!");

// Example: Sum of two numbers
function sum(a: number, b: number): number {
  return a + b;
}

// Read input
const input: string = process.argv[2] || "";
const [a, b] = input.split(" ").map(Number);

// Print result
console.log(sum(a, b));`,

  python: `# Python Template
print("Hello, World!")

# Example: Sum of two numbers
def sum(a, b):
    return a + b

# Read input
try:
    a, b = map(int, input().split())
    print(sum(a, b))
except:
    pass`,

  java: `// Java Template
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Example: Sum of two numbers
        java.util.Scanner scanner = new java.util.Scanner(System.in);
        try {
            int a = scanner.nextInt();
            int b = scanner.nextInt();
            System.out.println(sum(a, b));
        } catch (Exception e) {
            // Handle if no input provided
        }
    }
    
    public static int sum(int a, int b) {
        return a + b;
    }
}`,

  cpp: `// C++ Template
#include <iostream>
#include <string>

int sum(int a, int b) {
    return a + b;
}

int main() {
    std::cout << "Hello, World!" << std::endl;
    
    // Example: Sum of two numbers
    int a, b;
    std::cin >> a >> b;
    std::cout << sum(a, b) << std::endl;
    
    return 0;
}`,

  csharp: `// C# Template
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
        
        // Example: Sum of two numbers
        string[] input = Console.ReadLine().Split();
        try {
            int a = int.Parse(input[0]);
            int b = int.Parse(input[1]);
            Console.WriteLine(Sum(a, b));
        } catch (Exception) {
            // Handle if no input provided
        }
    }
    
    static int Sum(int a, int b) {
        return a + b;
    }
}`,

  php: `<?php
// PHP Template
echo "Hello, World!\\n";

// Example: Sum of two numbers
function sum($a, $b) {
    return $a + $b;
}

// Read input
$input = trim(fgets(STDIN));
list($a, $b) = array_map('intval', explode(' ', $input));
echo sum($a, $b) . "\\n";
?>`,

  ruby: `# Ruby Template
puts "Hello, World!"

# Example: Sum of two numbers
def sum(a, b)
  a + b
end

# Read input
begin
  a, b = gets.split.map(&:to_i)
  puts sum(a, b)
rescue
  # Handle if no input provided
end`,

  go: `// Go Template
package main

import (
	"fmt"
)

func sum(a, b int) int {
	return a + b
}

func main() {
	fmt.Println("Hello, World!")
	
	// Example: Sum of two numbers
	var a, b int
	fmt.Scanf("%d %d", &a, &b)
	fmt.Println(sum(a, b))
}`,

  rust: `// Rust Template
use std::io;

fn sum(a: i32, b: i32) -> i32 {
    a + b
}

fn main() {
    println!("Hello, World!");
    
    // Example: Sum of two numbers
    let mut input = String::new();
    io::stdin().read_line(&mut input).expect("Failed to read input");
    
    let numbers: Vec<i32> = input
        .split_whitespace()
        .map(|s| s.parse().expect("Failed to parse number"))
        .collect();
    
    if numbers.len() >= 2 {
        println!("{}", sum(numbers[0], numbers[1]));
    }
}`
};

export default codeTemplates; 