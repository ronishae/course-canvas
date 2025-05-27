class Requirement { }

// Grade requirement for one course
class GradeRequirement extends Requirement {
  constructor(minGrade, course) {
    super();
    this.minGrade = minGrade;
    this.requirements = course;
  }

  toString() {
    return `(${this.minGrade * 100}% in ${this.requirements})`;
  }
}

// Logical AND of multiple requirements
class And extends Requirement {
  constructor(requirements) {
    super();
    this.requirements = requirements;
  }

  toString(debug = false) {
    if (!debug) {
      if (this.requirements.length === 0) {
        return '';
      }
      if (this.requirements.length === 1) {
        return this.requirements[0].toString(); // No need for AND if there's only one requirement
      }
    }

    return `AND(${this.requirements.map(r => r.toString(debug)).join(", ")})`;
  }
}

// Logical OR of multiple requirements
class Or extends Requirement {
  constructor(requirements) {
    super();
    this.requirements = requirements;
  }

  toString(debug = false) {
    if (!debug) {
      if (this.requirements.length === 0) {
        return '';
      }
      if (this.requirements.length === 1) {
        return this.requirements[0].toString(); // No need for OR if there's only one requirement
      }
    }
    return `OR(${this.requirements.map(r => r.toString(debug)).join(", ")})`;
  }
}

function splitOutsideParens(str, delimiters) {
  const parts = [];
  let depth = 0;
  let currentPart = "";

  // only split when depth is 0 i.e. outside of parentheses
  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === "(") {
      depth++;
      currentPart += char;
    } else if (char === ")") {
      depth--;
      currentPart += char;
    } else if (delimiters.includes(char) && depth === 0) {
      parts.push(currentPart.trim());
      currentPart = "";
    } else {
      currentPart += char;
    }
  }
  if (currentPart) {
    parts.push(currentPart.trim());
  }
  return parts;
}

// not used for now since want to keep things like (or equivalent experience)
function containsValidArtsci(code) {
  // Check if the code matches the pattern for Artsci courses
  const match = code.match(/[A-Z]{3}[0-9]{3}[HY]1/);
  return match !== null;
}

function getFirstValidArtsci(str) {
  const match = str.match(/([A-Z]{3}[0-9]{3})[HY]1/);
  if (match) {
    return match[1]; // Return the first valid Artsci course code
  } else {
    return null; // No valid Artsci course code found
  }
}

function containsUTMorUTSC(code) {
  const matchUTM = code.match(/[A-Z]{3}[0-9]{3}[HY]5/);  // UTM ends in 5
  const matchUTSC = code.match(/[A-Z]{4}[0-9]{2}[HY][0-9]/); // UTSC has 4 letters 2 digits. (not sure what the last digit has to be)
  return matchUTM !== null || matchUTSC !== null;
}

// only working for artsci course format
function extractCourseCode(str) {
  const match = str.match(/^([A-Z]{3}\d{3})[HY]1$/);
  if (match) {
    return match[1];
  }
  else {
    return str;
  }
}

function getPercentRequirement(str) {
  const match = str.match(/(\d+)%/);
  if (match?.length > 2) {
    console.warn("getPercentRequirement: More than one match found", str);
  }

  if (match) {
    return parseInt(match[1], 10) / 100;
  }
  else {
    return null; // No percent requirement found
  }
}

function stringToRequirement(str, artsciOnly = true) {
  if (!str) {
    return new And([]);
  }
  // only accounting for artsci or applied science
  const multipleSets = str.split("Prerequisite for Faculty of Applied Science and Engineering students:");
  const artsci = multipleSets[0];  // only artsci
  const andParts = splitOutsideParens(artsci, [",", ";"]);
  var andOrParts = andParts.map(part => {
    const orParts = splitOutsideParens(part, ["/"]);
    var recurse = [];
    for (const orPart of orParts) {
      // match something starting with ( and ending with ) and has , or / or ; inside
      // use a group to capture text inside the parentheses
      const match = orPart.match(/^\((.*[,/;].*)\)$/);
      if (match) {
        const inner = match[1];
        recurse.push(stringToRequirement(inner));
      } else {
        recurse.push(orPart);
      }
    }

    // filter out UTM and UTSC courses
    if (artsciOnly) {
      recurse = recurse.filter(req => {
        if (typeof req === 'string') {
          return !containsUTMorUTSC(req);
        }
        else {
          return true; // keep the requirement if it's not a string
        }
      });
    }

    // remove the endings of the course labels
    recurse = recurse.map(req => {
      if (typeof req === 'string') {
        return extractCourseCode(req);
      }
      else {
        return req; // keep the requirement if it's not a string
      }
    })

    // if there is a percent requirement, convert it to a GradeRequirement
    recurse = recurse.map(req => {
      if (typeof req === 'string') {
        const percent = getPercentRequirement(req);
        if (percent) {
          return new GradeRequirement(percent, getFirstValidArtsci(req));
        } else {
          return req; // keep the requirement if there's no percent
        }
      } else {
        return req; // keep the requirement if it's not a string
      }
    });
    
    return new Or(recurse);
  });
  const andObject = new And(andOrParts);
  return andObject;
}

// Export for Node (CommonJS)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    Requirement,
    And,
    Or,
    stringToRequirement
  };
}

// Export for Browser (ES Module-style global)
if (typeof window !== 'undefined') {
  window.Requirement = Requirement;
  window.And = And;
  window.Or = Or;
  window.stringToRequirement = stringToRequirement;
}