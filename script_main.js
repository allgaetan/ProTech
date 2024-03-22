// Runs instantly when the page is loaded
document.addEventListener('DOMContentLoaded', function() {

/******************************************
MAIN PROGRAM
******************************************/
    
    // Main rdflib.js variables
    const store = $rdf.graph();
    const baseUrl = 'http://'; // Might have to be fetched with the input database
    const dataType = 'text/turtle'; 
    const SKOS = $rdf.Namespace('http://www.w3.org/2004/02/skos/core#');
    const localHost = 'http://localhost:8080'; 

    // Load SKOS data 
    function getData() {
        var urlParams = new URLSearchParams(window.location.search);
        var retrievedData = [
            urlParams.get('database'),
            urlParams.get('data' + urlParams.get('database'))
        ];
        return retrievedData;
    }

    const databaseType = getData()[0];
    const skosData = getData()[1];
    console.log(databaseType, skosData); // Monitor the type of database that has been chosen and the data that was passed as input for the skos files

    if (databaseType == 1) { // Example databases selected
        if (skosData === 'WOT') { // WOT selected
            var skosFiles = [
                localHost + '/.wot-catalogue/bacnet/scheme.ttl', // BACnet
                localHost + '/.wot-catalogue/ble/scheme.ttl', // Bluetooth Low Energy - General Attribute Profile
                localHost + '/.wot-catalogue/lwm2m/scheme.ttl', // Light-weight Machine-to-Machine (LWM2M)
                localHost + '/.wot-catalogue/ocf/scheme.ttl', // Swagger/OpenAPI Specification
                localHost + '/.wot-catalogue/onem2m/scheme.ttl' // oneM2M
            ]
        } else { // Lone concept scheme selected
            var skosFiles = [skosData];
        }
    }
    if (databaseType == 2) { // Web database selected
        skosFiles = [skosData];
    }
    
    // Cytoscape initialization
    var cy = cytoscape({
        container: document.getElementById('canvas'),
        style: [
        {
            selector: 'node',
            style: {
            'background-color': '#3498db',
            'label': 'data(label)',
            'width': 'data(size)',
            'height': 'data(size)'
            }
        },
        {
            selector: 'edge',
            style: {
            'line-color': '#ecf0f1'
            }
        }
        ]
    });
    // Mapping of relation types to colors
    const colorMap = {};

    Promise.all(
        skosFiles.map(skosFile =>
            fetch(skosFile)
            .then(response => response.text())
            .then(data => {
                $rdf.parse(data, store, baseUrl, dataType);
                console.log(`SKOS data loaded from ${skosFile}`);
            })
            .catch(error => console.error(`Error fetching SKOS data from ${skosFile}:`, error))
        )
    )
    .then(() => {
        // Initial rendering
        renderConceptSchemes();
        searchBar();

        document.getElementById('left-column').addEventListener('click', function (event) {
            var clickedElement = event.target;
            if (clickedElement.tagName === 'LI') {
                // Highlight the clicked concept
                clickedElement.classList.add('highlight');
                highlightedConcept = clickedElement;
                // Remove highlight from all other concepts
                const allConcepts = document.querySelectorAll('#left-column li');
                allConcepts.forEach(concept => {
                    if (concept !== clickedElement) {
                        concept.classList.add('highlight-off');
                        concept.classList.remove('highlight');
                    } else {
                        concept.classList.add('highlight');
                        concept.classList.remove('highlight-off');
                    }
                });

                const conceptId = event.target.dataset.conceptId;
                clearGraph();
                renderGraph(conceptId);
                renderConceptDetails(conceptId);
            }
        });
    })
    .catch(error => console.error('Error loading SKOS data:', error));

/******************************************
SEARCH BAR
******************************************/

    // Main search bar function
    function searchBar() {
        // Get the search input and dropdown elements
        const searchBar = document.getElementById('search-bar');
        const dropdown = document.createElement('div');
        // Event listener for the search bar input
        searchBar.addEventListener('input', function () {
            var searchTerm = searchBar.value.toLowerCase();
            if (searchTerm && searchTerm.trim().length > 0) {
                dropdown.id = 'dropdown';
                document.getElementById('search-box').appendChild(dropdown);
                updateDropdown(searchTerm, dropdown);
            } else {
                dropdown.remove();
            }
        });
    }
    
    // Function to update and display the dropdown
    function updateDropdown(searchTerm, dropdown) {
        // Clear the existing dropdown content
        dropdown.innerHTML = '';

        // Find concepts that match the search term
        const matchingConcepts = findMatchingConcepts(searchTerm);

        // Create and append dropdown items
        matchingConcepts.forEach(concept => {
            const dropdownItem = document.createElement('div');
            dropdownItem.textContent = store.any(concept, SKOS('prefLabel')).value;
            dropdownItem.dataset.conceptId = concept.value;

            // Event listener for clicking a dropdown item
            dropdownItem.addEventListener('click', function () {
                searchBar.value = dropdownItem.textContent;
                
                // Hide the dropdown after selecting an item
                dropdown.innerHTML = '';

                // Expand the necessary the hierarchy
                expandHierarchyForConcept(dropdownItem.dataset.conceptId);
            });
            dropdown.appendChild(dropdownItem);
        });

        // Display the dropdown
        if (matchingConcepts.length > 0) {
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
        }
    }

    // Function to find concepts that match the search term
    function findMatchingConcepts(searchTerm) {
        const allConcepts = store.each(undefined, undefined, SKOS('Concept'));
        return allConcepts.filter(concept => {
            const prefLabel = store.any(concept, SKOS('prefLabel')).value.toLowerCase();
            return prefLabel.includes(searchTerm);
        });
    }

    // Function to expand hierarchy to show a concept through simulated click events
    function expandHierarchyForConcept(conceptId) {
        const hierarchyPath = findHierarchyPath(conceptId);

        // Simulate click events on the hierarchy to expand
        var currentElement = document.getElementById('hierarchy');
        for (const conceptUri of hierarchyPath) {
            const conceptElement = [...currentElement.getElementsByTagName('li')].find(
                (li) => li.dataset.conceptId === conceptUri
            );
            if (conceptElement) {
                // Trigger a click event to expand only if not already expanded
                if (conceptElement.innerText === conceptElement.textContent) {
                    conceptElement.click();
                    currentElement = conceptElement.querySelector('ul');
                }
            }
        }
    }
    
    // Function to find the hierarchy path of a concept
    function findHierarchyPath(conceptId) {
        const hierarchyPath = [];

        // Goes through the hierarchy to find the path
        var currentConcept = store.any($rdf.sym(conceptId), SKOS('broader'), undefined);
        while (currentConcept) {
            hierarchyPath.unshift(currentConcept.value);
            currentConcept = store.any(currentConcept, SKOS('broader'), undefined);
        }

        // Include the concept scheme at the top of the hierarchy path
        const conceptScheme = store.any($rdf.sym(conceptId), SKOS('inScheme'), undefined);
        if (conceptScheme) {
            hierarchyPath.unshift(conceptScheme.value);
        }
        hierarchyPath.push(conceptId); // Initial element added at the end of the hierarchy path

        return hierarchyPath;
    }

/******************************************
CONCEPTS DETAILS
******************************************/

    // Function to render concept details
    function renderConceptDetails(conceptId) {
        const rightColumn = document.getElementById('right-column');
        const prefLabel = store.any($rdf.sym(conceptId), SKOS('prefLabel'), undefined);
        rightColumn.innerHTML = `<h1>Details of ${prefLabel}</h1>`;
    
        // Retrieve all statements related to the concept
        const statements = store.statementsMatching($rdf.sym(conceptId), undefined, undefined);
        if (statements.length > 0) {
            // Create a map to group statements by their predicate
            const propertiesMap = new Map();

            // Maps the properties and their values
            statements.forEach(statement => {
                const predicateValue = statement.predicate.value;
                const objectValue = statement.object.value;

                if (!propertiesMap.has(predicateValue)) {
                    propertiesMap.set(predicateValue, []);
                }
                propertiesMap.get(predicateValue).push(objectValue);
            });  

            // Iterate through the properties
            propertiesMap.forEach((values, predicate) => {
                // Create and append elements to display each property
                const property = document.createElement('p');
                property.innerHTML = `<b>${predicate.split('#')[1]} : </b>`;
                property.innerHTML += `<i>${values.join(', ')}</i>`;
                
                rightColumn.appendChild(property);
            });
        } 
    }

/******************************************
HIERARCHY
******************************************/

    // Function to display initial hierarchy level with concept schemes
    function renderConceptSchemes() {
        const leftColumn = document.getElementById('hierarchy');

        // Find all SKOS ConceptSchemes
        const conceptSchemes = store.each(undefined, undefined, SKOS('ConceptScheme'));

        const ul = document.createElement('ul');
        conceptSchemes.forEach(conceptScheme => {
            const li = document.createElement('li');
            li.textContent = store.any(conceptScheme, SKOS('prefLabel')).value;
            li.dataset.conceptId = conceptScheme.value;
            li.addEventListener('click', (event) => toggleHierarchy(event, conceptScheme.value, li));
            ul.appendChild(li);
        });
        leftColumn.appendChild(ul);
    }

    // Function to toggle hierarchy for a concept scheme
    function toggleHierarchy(event, conceptSchemeId, conceptSchemeElement) {
        if (event.target !== conceptSchemeElement) {
            // Click occurred on a subconcept, ignore
            return;
        }
        // Check if the top-level concepts are already displayed
        const existingUl = conceptSchemeElement.querySelector('ul');
        if (existingUl) {
            existingUl.remove();
            return;  // Hide the top-level concepts if already displayed
        }
        // Otherwise, render the hierarchy for the selected concept scheme
        renderHierarchy(conceptSchemeId, conceptSchemeElement);
    }

    // Function to render hierarchy navigation in a concept scheme
    function renderHierarchy(conceptSchemeId, conceptSchemeElement) {
        // Find all SKOS Concept(s) with broader relations
        const allConcepts = store.each(undefined, undefined, $rdf.sym(conceptSchemeId));
        const ul = document.createElement('ul');
        allConcepts.forEach(concept => {
            // Check if the concept has no broader relations (top-level concept)
            const broaderConcepts = store.each(concept, SKOS('broader'), undefined);
    
            if (broaderConcepts.length === 0) {
                const li = document.createElement('li');
                li.textContent = store.any(concept, SKOS('prefLabel')).value;
                li.dataset.conceptId = concept.value;  // Store the concept URI for later use
                toggleSubconcepts(concept, li);  // Render subconcepts recursively
                ul.appendChild(li);
            }
        });
        conceptSchemeElement.appendChild(ul);
    }

    // Function to toggle subconcepts
    function toggleSubconcepts(parentConcept, parentElement) {
        var subconceptsDisplayed = false;
        var subul;

        parentElement.addEventListener('click', (event) => {
            if (event.target !== parentElement) {
                // Click occurred on a subconcept, ignore
                return;
            }

            if (subconceptsDisplayed) {
                // Subconcepts are hid because already displayed
                hideSubconcepts(parentElement);
                subconceptsDisplayed = false;
                return;
            }

            // Subconcepts are rendered because not already displayed
            subul = document.createElement('ul');
            const narrowerConcepts = store.each(undefined, SKOS('broader'), parentConcept);

            if (narrowerConcepts.length > 0) {
                narrowerConcepts.forEach(concept => {
                    const li = document.createElement('li');
                    li.textContent = store.any(concept, SKOS('prefLabel')).value;
                    li.dataset.conceptId = concept.value;
                    subul.appendChild(li);
                    toggleSubconcepts(concept, li);
                });
            }

            parentElement.appendChild(subul);
            subconceptsDisplayed = true;
        });

        // Function to hide subconcepts recursively
        function hideSubconcepts(element) {
            const ul = element.querySelector('ul');
            if (ul) {
                ul.remove();
                const childElements = ul.querySelectorAll('li');
                childElements.forEach(childElement => {
                    hideSubconcepts(childElement);
                });
            }
        }
    }

/******************************************
RELATION GRAPH
******************************************/
    
    // Function to render graph display
    function renderGraph(conceptId) {
        // Add the selected concept to the graph
        const sanitizedConceptId = sanitizeForSelector(conceptId);
        const prefLabel = store.any($rdf.sym(conceptId), SKOS('prefLabel'), undefined);
        cy.add({ data: { id: sanitizedConceptId, label: prefLabel, size: 50, color: '#3498db' } });
    
        // Fetch related concepts and add them to the graph
        const relatedConcepts = getRelatedConcepts(conceptId);

        // Creating another mapping of relation to create the graph caption
        const thisGraphColorMap = {};
    
        relatedConcepts.forEach(({ relatedConcept, relationType }) => {
            // Set color based on the relation type or assign a new color if not encountered before
            const color = colorMap[relationType] || getRandomColor();
            colorMap[relationType] = color;

            // Build the caption mapping
            thisGraphColorMap[relationType] = colorMap[relationType];
    
            // Sanitize IDs for valid CSS selectors
            const sanitizedRelatedConceptId = sanitizeForSelector(relatedConcept);
            const edgeId = `${sanitizedConceptId}-${sanitizedRelatedConceptId}`;
    
            cy.add({ data: { id: sanitizedRelatedConceptId, label: relatedConcept, size: 35 } });
            cy.add({ data: { id: edgeId, source: sanitizedConceptId, target: sanitizedRelatedConceptId } });
    
            // Update the style of the added nodes and edges
            cy.style().selector(`#${sanitizedRelatedConceptId}`).style({ 'background-color': color });
            cy.style().selector(`#${edgeId}`).style({ 'line-color': color });
        });
    
        // Layout the updated graph
        cy.layout({ name: 'cose' }).run();

        // Create a caption for the color map
        const colorMapCaption = document.getElementById('caption');
        colorMapCaption.innerHTML = '<strong>Color Map:</strong>';
        
        // Loop through the colorMap and add color information to the caption
        for (const relationType in thisGraphColorMap) {
            const color = colorMap[relationType];
            // Use a span to contain both the colored box and the relation string
            colorMapCaption.innerHTML += `<div><span style='display: inline-block; width: 10px; height: 10px; background-color: ${color}; margin-right: 5px;'></span>${relationType}</div>`;
        }
    }
    
    function getRelatedConcepts(conceptId) {
        var relatedConcepts = [];
    
        // Iterate over the statements in the store
        store.statementsMatching($rdf.sym(conceptId), null, null).forEach(statement => {
        
            if (statement.predicate && statement.object.value.startsWith('http:')) {
                // Check if the relation is a relation between concepts or concept scheme
                const relationTargetId = statement.object.value;
                const isConcept = store.statementsMatching($rdf.sym(relationTargetId), undefined, SKOS('Concept'));
                const isConceptScheme = store.statementsMatching($rdf.sym(relationTargetId), undefined, SKOS('ConceptScheme'));
   
                if (isConcept.length > 0) {
                    // Add the related concept and its type to the list
                    relatedConcepts.push({
                        relatedConcept: store.any($rdf.sym(isConcept[0].subject.value), SKOS('prefLabel'), undefined),
                        relationType: statement.predicate.value.split('#')[1]
                    });
                }
                if (isConceptScheme.length > 0 ) {
                    // Add the related concept and its type to the list
                    relatedConcepts.push({
                        relatedConcept: store.any($rdf.sym(isConceptScheme[0].subject.value), SKOS('prefLabel'), undefined),
                        relationType: statement.predicate.value.split('#')[1]
                    });
                }
            }
        });
  
        return relatedConcepts;
    }
    
    // Function to generate a random color
    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    
    // Function to sanitize a string for use in CSS selector
    function sanitizeForSelector(str) {
        return encodeURIComponent(str)
            .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16))
            .replace(/%/g, '_') // Replace % with an underscore or any other character you prefer
            .replace(/\./g, '_'); // Replace dots with underscores
    }

    function clearGraph() {
        cy.remove(cy.elements());
    }
});

