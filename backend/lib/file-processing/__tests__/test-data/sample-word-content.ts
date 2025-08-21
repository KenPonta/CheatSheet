// Sample Word document content for testing

export const sampleWordHtml = `
<h1>Computer Science Study Guide</h1>
<p>This document contains key concepts for computer science students.</p>

<h2>Data Structures</h2>
<p>Data structures are fundamental building blocks in computer science.</p>

<h3>Arrays</h3>
<p>Arrays are collections of elements stored in contiguous memory locations.</p>
<ul>
  <li>Fixed size in most languages</li>
  <li>O(1) access time by index</li>
  <li>O(n) insertion and deletion</li>
</ul>

<h3>Linked Lists</h3>
<p>Linked lists consist of nodes where each node contains data and a reference to the next node.</p>
<table>
  <tr>
    <th>Operation</th>
    <th>Time Complexity</th>
    <th>Space Complexity</th>
  </tr>
  <tr>
    <td>Search</td>
    <td>O(n)</td>
    <td>O(1)</td>
  </tr>
  <tr>
    <td>Insertion</td>
    <td>O(1)</td>
    <td>O(1)</td>
  </tr>
  <tr>
    <td>Deletion</td>
    <td>O(1)</td>
    <td>O(1)</td>
  </tr>
</table>

<h2>Algorithms</h2>
<p>Algorithms are step-by-step procedures for solving problems.</p>

<h3>Sorting Algorithms</h3>
<p>Common sorting algorithms include:</p>
<ol>
  <li><strong>Bubble Sort</strong> - O(n²) time complexity</li>
  <li><strong>Quick Sort</strong> - O(n log n) average case</li>
  <li><strong>Merge Sort</strong> - O(n log n) guaranteed</li>
</ol>

<h3>Search Algorithms</h3>
<p>Efficient searching is crucial for performance.</p>

<h4>Binary Search</h4>
<p>Binary search works on sorted arrays with O(log n) time complexity.</p>

<h2>Example Problems</h2>
<p>Here are some practice problems:</p>

<table>
  <tr>
    <th>Problem</th>
    <th>Difficulty</th>
    <th>Topic</th>
  </tr>
  <tr>
    <td>Two Sum</td>
    <td>Easy</td>
    <td>Arrays, Hash Tables</td>
  </tr>
  <tr>
    <td>Reverse Linked List</td>
    <td>Easy</td>
    <td>Linked Lists</td>
  </tr>
  <tr>
    <td>Binary Tree Traversal</td>
    <td>Medium</td>
    <td>Trees, Recursion</td>
  </tr>
</table>
`;

export const sampleWordText = `Computer Science Study Guide

This document contains key concepts for computer science students.

Data Structures

Data structures are fundamental building blocks in computer science.

Arrays

Arrays are collections of elements stored in contiguous memory locations.

• Fixed size in most languages
• O(1) access time by index
• O(n) insertion and deletion

Linked Lists

Linked lists consist of nodes where each node contains data and a reference to the next node.

Operation	Time Complexity	Space Complexity
Search	O(n)	O(1)
Insertion	O(1)	O(1)
Deletion	O(1)	O(1)

Algorithms

Algorithms are step-by-step procedures for solving problems.

Sorting Algorithms

Common sorting algorithms include:

1. Bubble Sort - O(n²) time complexity
2. Quick Sort - O(n log n) average case
3. Merge Sort - O(n log n) guaranteed

Search Algorithms

Efficient searching is crucial for performance.

Binary Search

Binary search works on sorted arrays with O(log n) time complexity.

Example Problems

Here are some practice problems:

Problem	Difficulty	Topic
Two Sum	Easy	Arrays, Hash Tables
Reverse Linked List	Easy	Linked Lists
Binary Tree Traversal	Medium	Trees, Recursion`;

export const expectedWordStructure = {
  headings: [
    { level: 1, text: 'Computer Science Study Guide' },
    { level: 2, text: 'Data Structures' },
    { level: 3, text: 'Arrays' },
    { level: 3, text: 'Linked Lists' },
    { level: 2, text: 'Algorithms' },
    { level: 3, text: 'Sorting Algorithms' },
    { level: 3, text: 'Search Algorithms' },
    { level: 4, text: 'Binary Search' },
    { level: 2, text: 'Example Problems' }
  ],
  tables: [
    {
      headers: ['Operation', 'Time Complexity', 'Space Complexity'],
      rows: [
        ['Search', 'O(n)', 'O(1)'],
        ['Insertion', 'O(1)', 'O(1)'],
        ['Deletion', 'O(1)', 'O(1)']
      ]
    },
    {
      headers: ['Problem', 'Difficulty', 'Topic'],
      rows: [
        ['Two Sum', 'Easy', 'Arrays, Hash Tables'],
        ['Reverse Linked List', 'Easy', 'Linked Lists'],
        ['Binary Tree Traversal', 'Medium', 'Trees, Recursion']
      ]
    }
  ]
};