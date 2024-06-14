function initialize() {
    var homeInput = document.getElementById('home');
    var clientInput = document.getElementById('client');
    var officeInput = document.getElementById('office');

    var homeAutocomplete = new google.maps.places.Autocomplete(homeInput);
    var clientAutocomplete = new google.maps.places.Autocomplete(clientInput);
    var officeAutocomplete = new google.maps.places.Autocomplete(officeInput);

    homeAutocomplete.addListener('place_changed', function() {
        var place = homeAutocomplete.getPlace();
        if (!place.geometry) {
            alert("No details available for input: '" + place.name + "'");
            return;
        }
    });

    clientAutocomplete.addListener('place_changed', function() {
        var place = clientAutocomplete.getPlace();
        if (!place.geometry) {
            alert("No details available for input: '" + place.name + "'");
            return;
        }
    });

    officeAutocomplete.addListener('place_changed', function() {
        var place = officeAutocomplete.getPlace();
        if (!place.geometry) {
            alert("No details available for input: '" + place.name + "'");
            return;
        }
    });

    // Load saved addresses from local storage
    loadSavedAddresses();

    // Adjust flashing color based on system color scheme
    adjustFlashingColor();
}

function loadSavedAddresses() {
    var home = localStorage.getItem('homeAddress');
    var client = localStorage.getItem('clientAddress');
    var office = localStorage.getItem('officeAddress');
    var saveHomeChecked = localStorage.getItem('saveHomeChecked') === 'true';
    var saveClientChecked = localStorage.getItem('saveClientChecked') === 'true';
    var saveOfficeChecked = localStorage.getItem('saveOfficeChecked') === 'true';

    if (home) document.getElementById('home').value = home;
    if (client) document.getElementById('client').value = client;
    if (office) document.getElementById('office').value = office;
    document.getElementById('saveHome').checked = saveHomeChecked;
    document.getElementById('saveClient').checked = saveClientChecked;
    document.getElementById('saveOffice').checked = saveOfficeChecked;
}

function adjustFlashingColor() {
    const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const flashColor = darkMode ? 'white' : 'black';

    const styleSheet = document.styleSheets[0];
    styleSheet.insertRule(`
        @keyframes flash-green {
            0%, 100% { color: green; }
            50% { color: ${flashColor}; }
        }
    `, styleSheet.cssRules.length);

    styleSheet.insertRule(`
        @keyframes flash-red {
            0%, 100% { color: red; }
            50% { color: ${flashColor}; }
        }
    `, styleSheet.cssRules.length);
}

function calculateClosest() {
    var home = document.getElementById("home").value;
    var client = document.getElementById("client").value;
    var office = document.getElementById("office").value;
    var errorMessage = document.getElementById('error-message');
    var clientInput = document.getElementById("client");
    var resultDiv = document.getElementById('result');
    var loader = document.getElementById('loader');

    // Clear previous output and error messages
    resultDiv.innerHTML = '';
    errorMessage.textContent = "";
    clientInput.classList.remove('error');

    if (!client) {
        errorMessage.textContent = "Please enter the client address.";
        clientInput.classList.add('error');
        return;
    }

    // Show loader
    loader.style.display = 'block';

    var destinations = [];
    if (home) destinations.push(home);
    if (office) destinations.push(office);

    if (destinations.length === 0) {
        alert("Please enter at least the home or office address.");
        loader.style.display = 'none'; // Hide loader if there are no destinations
        return;
    }

    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
        origins: [client],
        destinations: destinations,
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.IMPERIAL, // Use Imperial units for miles
        avoidHighways: false,
        avoidTolls: false
    }, function(response, status) {
        // Hide loader
        loader.style.display = 'none';
        callback(response, status);
    });

    // Save addresses to local storage if checkboxes are checked
    saveAddresses(home, client, office);

    // Scroll to results
    document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
}

function saveAddresses(home, client, office) {
    if (document.getElementById('saveHome').checked && home) {
        localStorage.setItem('homeAddress', home);
    }
    if (document.getElementById('saveClient').checked && client) {
        localStorage.setItem('clientAddress', client);
    }
    if (document.getElementById('saveOffice').checked && office) {
        localStorage.setItem('officeAddress', office);
    }
    saveCheckboxStates();
}

function saveCheckboxStates() {
    localStorage.setItem('saveHomeChecked', document.getElementById('saveHome').checked);
    localStorage.setItem('saveClientChecked', document.getElementById('saveClient').checked);
    localStorage.setItem('saveOfficeChecked', document.getElementById('saveOffice').checked);
}

function resetAddresses() {
    localStorage.removeItem('homeAddress');
    localStorage.removeItem('clientAddress');
    localStorage.removeItem('officeAddress');
    localStorage.removeItem('saveHomeChecked');
    localStorage.removeItem('saveClientChecked');
    localStorage.removeItem('saveOfficeChecked');
    document.getElementById('home').value = '';
    document.getElementById('client').value = '';
    document.getElementById('office').value = '';
    document.getElementById('saveHome').checked = false;
    document.getElementById('saveClient').checked = false;
    document.getElementById('saveOffice').checked = false;
}

function callback(response, status) {
    var resultDiv = document.getElementById('result');
    if (status == 'OK') {
        var origins = response.originAddresses;
        var destinations = response.destinationAddresses;
        resultDiv.innerHTML = '';

        var results = response.rows[0].elements;
        var distances = results.map((result, index) => {
            return {
                address: destinations[index],
                distance: result.distance.text
            };
        });

        if (distances.length === 1) {
            // Only one destination (home or office) provided
            resultDiv.innerHTML = `<p>The distance from <strong>${origins[0]}</strong> to <strong>${distances[0].address}</strong> is <strong>${distances[0].distance}</strong>.</p>`;
        } else {
            // Both home and office provided
            var homeDistance = results[0].distance.value;
            var officeDistance = results[1].distance.value;

            var closestIndex = homeDistance < officeDistance ? 0 : 1;
            var closestAddress = distances[closestIndex].address;
            var closestDistance = distances[closestIndex].distance;

            var furthestIndex = homeDistance > officeDistance ? 0 : 1;
            var furthestAddress = distances[furthestIndex].address;
            var furthestDistance = distances[furthestIndex].distance;

            var difference = Math.abs(homeDistance - officeDistance) / 1609.34; // Convert meters to miles
            var differenceClass = homeDistance < officeDistance ? 'green' : 'red';
            var flashClass = homeDistance < officeDistance ? 'green-flash' : 'red-flash';

            var closerMessage = homeDistance < officeDistance ? `<p class="${flashClass}">Home is closer</p>` : `<p class="${flashClass}">Office is closer</p>`;

            resultDiv.innerHTML = `
                <p>The distance from <strong>${origins[0]}</strong> to <strong>${distances[0].address}</strong> is <strong>${distances[0].distance}</strong>.</p>
                <p>The distance from <strong>${origins[0]}</strong> to <strong>${distances[1].address}</strong> is <strong>${distances[1].distance}</strong>.</p>
                <p class="${differenceClass}">The difference in miles between the home and office addresses is <strong>${difference.toFixed(2)} miles</strong>.</p>
                ${closerMessage}
            `;
        }
    } else {
        resultDiv.innerHTML = 'Error: ' + status;
    }
}

// Initialize the autocomplete functionality
window.addEventListener('load', initialize);