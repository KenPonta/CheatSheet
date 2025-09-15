---
title: "Test 1: 05 Counting_01_student.pdf"
date: "2025-09-10"
documentclass: scrartcl
classoption:
- twocolumn
- "12pt"
geometry:
- margin=0.75mm
- columnsep=undefinedmm
fontsize: "12pt"
linestretch: "1.15"
header-includes:
- "\usepackage{amsmath}"
- "\usepackage{amsfonts}"
- "\usepackage{amssymb}"
- "\usepackage{mathtools}"
- "\usepackage{microtype}"
- "\usepackage{needspace}"
- \clubpenalty=10000
- \widowpenalty=10000
- "\setlength{\parskip}{0.25em}"
- "\setlength{\parindent}{0pt}"
math-renderer: mathjax
preserve-tabs: true
wrap: preserve
metadata:
  total-sections: "13"
  total-formulas: "0"
  total-examples: "0"
  preservation-score: "0.9289473684210526"
  source-files:
  - "05 Counting_01_student.pdf"

---

# Contents

- [Part 1: Discrete Probability](#part-1)
  - [1.1 Probability Basics](#section-1-1)
  - [1.2 Complements and Unions](#section-1-2)
  - [1.3 Conditional Probability](#section-1-3)
  - [1.4 Bayes' Theorem](#section-1-4)
  - [1.5 Independence](#section-1-5)
  - [1.6 Bernoulli Trials](#section-1-6)
  - [1.7 Random Variables](#section-1-7)
  - [1.8 Expected Value, Variance, and Standard Deviation](#section-1-8)
- [Part 2: Relations](#part-2)
  - [2.1 Relation Definitions and Properties](#section-2-1)
  - [2.2 Reflexive, Irreflexive, Symmetric, Antisymmetric, Transitive](#section-2-2)
  - [2.3 Combining Relations](#section-2-3)
  - [2.4 N-ary Relations](#section-2-4)
  - [2.5 SQL-style Operations](#section-2-5)


# Part I: Discrete Probability {#part-1}

## 1.1 Probability Basics {#section-1-1}

**Probability Basics**

Key concepts to study:
• Sample space and events
• Basic probability rules: P(A) = favorable outcomes / total outcomes
• Properties: 0 ≤ P(A) ≤ 1, P(S) = 1, P(∅) = 0

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.2 Complements and Unions {#section-1-2}

**Complements and Unions**

Key formulas:
• Complement: P(A') = 1 - P(A)
• Union: P(A ∪ B) = P(A) + P(B) - P(A ∩ B)
• For disjoint events: P(A ∪ B) = P(A) + P(B)

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.3 Conditional Probability {#section-1-3}

**Conditional Probability**

Key formula:
• P(A|B) = P(A ∩ B) / P(B), where P(B) > 0

Important concepts:
• Conditional probability represents probability of A given B has occurred
• Multiplication rule: P(A ∩ B) = P(A|B) × P(B)

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.4 Bayes' Theorem {#section-1-4}

**Bayes' Theorem**

Bayes' Theorem:
• P(A|B) = P(B|A) × P(A) / P(B)

Applications:
• Updating probabilities with new information
• Medical diagnosis, spam filtering, etc.

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.5 Independence {#section-1-5}

**Independence**

Key concepts:
• Events A and B are independent if P(A ∩ B) = P(A) × P(B)
• Equivalently: P(A|B) = P(A) and P(B|A) = P(B)
• Multiplication rule for independent events

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.6 Bernoulli Trials {#section-1-6}

**Bernoulli Trials**

Key concepts:
• Sequence of independent trials with two outcomes (success/failure)
• Probability of success p remains constant
• Binomial distribution: P(X = k) = C(n,k) × p^k × (1-p)^(n-k)

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.7 Random Variables {#section-1-7}

**Random Variables**

Key concepts:
• Function that assigns numerical values to outcomes
• Discrete vs. continuous random variables
• Probability mass function (PMF) for discrete variables
• Cumulative distribution function (CDF)

*Note: This section requires additional study material as the source document appears to be image-based.*

## 1.8 Expected Value, Variance, and Standard Deviation {#section-1-8}

**Expected Value, Variance, and Standard Deviation**

Key formulas:
• Expected Value: E[X] = Σ x × P(X = x)
• Variance: Var(X) = E[X²] - (E[X])²
• Standard Deviation: σ = √Var(X)
• Properties: E[aX + b] = aE[X] + b, Var(aX + b) = a²Var(X)

*Note: This section requires additional study material as the source document appears to be image-based.*

# Part II: Relations {#part-2}

## 2.1 Relation Definitions and Properties {#section-2-1}

**Relation Definitions and Properties**

This section covers: relation, ordered pair, cartesian product, domain, range

*Note: Content extraction was limited. Please refer to the original document for complete information.*

## 2.2 Reflexive, Irreflexive, Symmetric, Antisymmetric, Transitive {#section-2-2}

**Reflexive, Irreflexive, Symmetric, Antisymmetric, Transitive**

This section covers: reflexive, irreflexive, symmetric, antisymmetric, transitive

*Note: Content extraction was limited. Please refer to the original document for complete information.*

## 2.3 Combining Relations {#section-2-3}

**Combining Relations**

This section covers: composition, inverse, union of relations, intersection of relations

*Note: Content extraction was limited. Please refer to the original document for complete information.*

## 2.4 N-ary Relations {#section-2-4}

**N-ary Relations**

This section covers: n-ary, ternary, quaternary, tuple

*Note: Content extraction was limited. Please refer to the original document for complete information.*

## 2.5 SQL-style Operations {#section-2-5}

**SQL-style Operations**

This section covers: sql, select, project, join, relational algebra

*Note: Content extraction was limited. Please refer to the original document for complete information.*