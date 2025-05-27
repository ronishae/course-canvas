cytoscape.use(cytoscapeDagre);

// Load courses.json from the same folder
async function loadCourses() {
  // const res = await fetch('./testdata.json');
  const res = await fetch('./courses.json');
  if (!res.ok) {
    console.error('Failed to load courses.json');
    return;
  }
  return res.json();
}

// Main async function
(async function () {
  const courses = await loadCourses();
  if (!courses || !window.stringToRequirement) {
    console.error("Missing course data or stringToRequirement not loaded.");
    return;
  }

  const nodes = new Set();
  const node_info = {};
  const edges = [];
  const edge_info = [];

  function addCourseIfMissing(course) {
    nodes.add(course);
    if (node_info[course] === undefined || node_info[course] === null) {
      node_info[course] = {
        label: course,
        classes: []
      };
      node_info[course].classes.push('course');
    }
    // or if it is missing tag it as missing, but it should always be labelled as a course
    if (!courses[course]) {
      node_info[course].classes.push('missing');
    }
  }

  // Unique ID counter for logic gate nodes
  let logicNodeCounter = 0;

  // Generate a unique ID for And/Or logic nodes
  function generateLogicNodeId(type) {
    return `_logic_${type}_${logicNodeCounter++}`;
  }

  function addCourseAndEdge(req, targetCourse, style = 'solid-edge') {
    // add the prereq if we haven't reached it yet
    addCourseIfMissing(req);

    edges.push({ source: req, target: targetCourse });
    edge_info.push({ style: 'solid-edge' }); // default (e.g., course to course)
  }

  // Recursive function to walk the AST
  function walkRequirementTree(req, targetCourse, isStart = false) {
    // Base case: direct course code
    if (!req) return;

    if (typeof req === 'string') {
      addCourseAndEdge(req, targetCourse, 'solid-edge');
      return;
    }

    // Recursive case: AND or OR
    if (req instanceof Requirement) {
      // Only one child, no intermediate required; keep walking the tree
      // Or if it is a root node (0 prerequisites), do not have a logic node into it
      if (req.requirements.length <= 1) {
        walkRequirementTree(req.requirements[0], targetCourse);
        return;
      }

      // case with multiple children
      var logicType = '';
      if (req instanceof And) {
        logicType = 'And';
      }
      else if (req instanceof Or) {
        logicType = 'Or';
      }
      else {
        logicType = 'GradeRequirement';
      }
      const logicNodeId = generateLogicNodeId(logicType);

      // Add logic node
      nodes.add(logicNodeId);
      node_info[logicNodeId] = {
        label: req instanceof GradeRequirement ? req.minGrade * 100 + '%' : logicNodeId,
        classes: [logicType.toLowerCase(), 'logic']
      };

      edges.push({ source: logicNodeId, target: targetCourse });
      edge_info.push({ style: 'solid-edge' });

      if (req instanceof GradeRequirement) {
        walkRequirementTree(req.requirements, logicNodeId);
      }
      else {
        // Recursively connect each child into the logic node
        // console.log(logicNodeId, req.requirements);
        for (const childReq of req.requirements) {
          if (typeof childReq === 'string') {
            const prereq = childReq;
            addCourseIfMissing(prereq);

            edges.push({ source: prereq, target: logicNodeId });
            // TODO: update for grade requirement nodes
            edge_info.push({
              style: logicType === 'And' ? 'solid-edge' : 'dotted-edge'
            });
          } else {
            // Pass logicNodeId as the new target, so the final descendant connects to it
            walkRequirementTree(childReq, logicNodeId);
          }
        }
      }
    }
  }

  // Go through each course and parse its prerequisites
  for (const courseCode in courses) {
    const course = courses[courseCode];

    // Add the course itself as a node
    nodes.add(courseCode);
    node_info[courseCode] = {
      label: courseCode,
      classes: ['course']
    };

    const parsedRequirement = stringToRequirement(course.prerequisite);

    walkRequirementTree(parsedRequirement, courseCode, isStart = true);
  }

  const cy = cytoscape({
    container: document.getElementById('cy'),
    elements: [
      // Create nodes from node_info
      ...[...nodes].map(id => ({
        data: { id, label: node_info[id]?.label || id },
        classes: (node_info[id]?.classes || []).join(' ')
      })),

      // Create edges with classes for style (solid or dotted)
      ...edges.map((e, i) => ({
        data: {
          id: `${e.source}->${e.target}`,
          source: e.source,
          target: e.target
        },
        // Use the style from edge_info or default to 'solid-edge'
        classes: edge_info[i]?.style || 'solid-edge'
      }))
    ],

    style: [
      // Regular course node
      {
        selector: 'node.course',
        style: {
          'background-color': '#3498db',
          'label': 'data(label)',
          'shape': 'round-rectangle',
          'color': '#000',
          'font-size': 12,
          'text-valign': 'center',
          'text-halign': 'center',
          'width': 60,
          'height': 30
        }
      },
      // Missing course node
      {
        selector: 'node.missing',
        style: {
          'background-color': '#e74c3c',
          'label': 'data(label)',
          'color': '#000',
          'shape': 'ellipse'
        }
      },
      // Any type of logic node
      {
        selector: 'node.logic',
        style: {
          'shape': 'diamond',
          'color': '#000',
          'label': 'data(label)',
        }
      },
      // AND logic node
      {
        selector: 'node.and',
        style: {
          'background-color': '#2ecc71',
        }
      },
      // OR logic node
      {
        selector: 'node.or',
        style: {
          'background-color': '#f39c12',
        }
      },
      {
        selector: 'node.grade_requirement',
        style: {
          'background-color': '#9b59b6',
        }
      },
      // Solid edge (default)
      {
        selector: 'edge.solid-edge',
        style: {
          'width': 2,
          'line-color': '#2ecc71',
          'target-arrow-color': '#2ecc71',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'solid'
        }
      },
      // Dotted edge (OR prerequisites)
      {
        selector: 'edge.dotted-edge',
        style: {
          'width': 2,
          'line-color': '#f39c12',
          'target-arrow-color': '#999',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'line-style': 'dotted'
        }
      },
      // Highlighted
      {
        selector: '.highlighted',
        style: {
          'background-color': '#f1c40f',
          'line-color': '#f1c40f',
          'target-arrow-color': '#f1c40f'
        }
      }
    ],

    layout: {
      name: 'dagre', // works best for these graphs
      rankDir: 'BT',
      nodeSep: 50,
      edgeSep: 10,
      rankSep: 45
    }
  });


  // Click to highlight all prerequisites (upstream dependencies)
  // incorrect direction
  // cy.on('tap', 'node', function (evt) {
  //   cy.elements().removeClass('highlighted');

  //   const node = evt.target;
  //   const bfs = cy.elements().bfs({
  //     roots: node,
  //     directed: true,
  //     visit: function (v, e) {
  //       v.addClass('highlighted');
  //       if (e) e.addClass('highlighted');
  //     },
  //     direction: 'incoming'
  //   });
  // });

})();
