document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG ---
    // Get credentials from the global config object created by config.js
    const supabaseUrlFromConfig = window.SUPABASE_CONFIG?.url;
    const supabaseAnonKeyFromConfig = window.SUPABASE_CONFIG?.anonKey;

    // --- DOM Elements ---
    const runForm = document.getElementById('run-form');
    const runDateInput = document.getElementById('run-date');
    const runKmInput = document.getElementById('run-km');
    const statusDiv = document.getElementById('status');
    const calendarContainer = document.getElementById('calendar'); // Target for js-Calendar
    const selectedDayInfoDiv = document.getElementById('selected-day-info');

    // --- State ---
    let jsCalendarInstance = null; // To hold the js-Calendar instance
    let allRuns = []; // Store fetched runs { date: 'YYYY-MM-DD', kilometers: X }
    let supabaseClient = null;

    // --- Functions ---
    function setStatus(message, isError = false) {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.style.color = isError ? 'red' : 'green';
            setTimeout(() => {
                 if(statusDiv.textContent === message) {
                     statusDiv.textContent = '';
                 }
            }, 3000);
        } else {
            console.log("Status:", message);
            if (isError) console.error("Status Error:", message);
        }
    }

    // --- Initialize Supabase Client ---
    // Check if config exists and values are not placeholders
    if (!supabaseUrlFromConfig || !supabaseAnonKeyFromConfig ||
        supabaseUrlFromConfig === 'YOUR_SUPABASE_URL' || supabaseAnonKeyFromConfig === 'YOUR_SUPABASE_ANON_KEY') {
        // Update error message to refer to config.js
        setStatus('ERROR: Supabase credentials missing or invalid in config.js. Please check config.js.', true);
        if(runForm) runForm.style.display = 'none'; // Optionally hide form
        return; // Stop execution if config is invalid
    }

    try {
        // Use credentials from config
        supabaseClient = supabase.createClient(supabaseUrlFromConfig, supabaseAnonKeyFromConfig);
        console.log("Supabase client initialized successfully using config.js.");
    } catch (error) {
        console.error("Error initializing Supabase:", error);
        setStatus(`Error initializing Supabase: ${error.message}. Check console for details.`, true);
        return;
    }

    // --- js-Calendar Setup and Update ---

    function setupCalendar() {
        if (!calendarContainer || typeof jsCalendar !== 'function') {
            console.error("Cannot setup calendar: Container or jsCalendar library not found.");
            setStatus('Error initializing calendar library.', true);
            return false; // Indicate failure
        }

        try {
            // Initialize jsCalendar on the container div
            jsCalendarInstance = jsCalendar.new(calendarContainer);

            // Add event listener for date clicks (on the instance)
            jsCalendarInstance.onDateClick((event, date) => {
                handleDateClick(date);
            });

            // Add event listener for month changes to re-apply markers
            jsCalendarInstance.onMonthChange(() => {
                 console.log("Month changed, re-applying markers...");
                 // Short delay to allow DOM update before marking
                 setTimeout(updateCalendarMarkers, 50);
            });

            console.log('js-Calendar initialized.');
            selectedDayInfoDiv.textContent = 'Click on a date with a run (marked) to see details.';
            return true; // Indicate success
        } catch(error) {
             console.error("Error during jsCalendar initialization:", error);
             setStatus(`Error setting up calendar: ${error.message}`, true);
             return false; // Indicate failure
        }
    }

    // Function to add markers/classes to dates with runs
    function updateCalendarMarkers() {
        if (!jsCalendarInstance || !calendarContainer) return;
        console.log("Updating calendar markers...");

        // 1. Clear existing markers (important for updates)
        const existingMarkers = calendarContainer.querySelectorAll('.jsCalendar-day.has-run');
        existingMarkers.forEach(marker => {
            marker.classList.remove('has-run');
            delete marker.dataset.kilometers; // Clear old data
            delete marker.dataset.runDate;
        });

        // 2. Add new markers based on `allRuns` data
        // Use an object to group runs by date for efficient lookup later
        const runsByDate = {};
        allRuns.forEach(run => {
            if (!runsByDate[run.date]) {
                runsByDate[run.date] = [];
            }
            runsByDate[run.date].push(run.kilometers); // Store just the km for marking
        });

        // Iterate over dates that have runs
        for (const dateStr in runsByDate) {
             try {
                // Create Date object carefully
                const parts = dateStr.split('-');
                const runDateUTC = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
                const runDateLocal = new Date(runDateUTC.getUTCFullYear(), runDateUTC.getUTCMonth(), runDateUTC.getUTCDate());

                 const dayElement = jsCalendarInstance.getDateElement(runDateLocal);

                 if (dayElement) {
                    dayElement.classList.add('has-run');
                    // Store the date string on the element for easy retrieval on click
                    dayElement.dataset.runDate = dateStr;
                 }
            } catch (e) {
                console.error(`Error processing run date ${dateStr} for marking:`, e);
            }
        }
        console.log("Calendar markers updated.");
    }

    // ** UPDATED Function to handle clicks on dates **
    function handleDateClick(date) {
        // 'date' is a JavaScript Date object from jsCalendar (local time)
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        const clickedDateStr = `${year}-${month}-${day}`; // Format as YYYY-MM-DD

        console.log(`Date clicked: ${clickedDateStr}`);

        // Find all runs matching the clicked date from the master list
        const runsOnThisDate = allRuns.filter(run => run.date === clickedDateStr);

        if (runsOnThisDate.length > 0) {
            let totalKm = 0;
            let detailsHtml = `<strong>Runs on ${clickedDateStr}:</strong><ul>`;

            runsOnThisDate.forEach(run => {
                const km = parseFloat(run.kilometers); // Ensure it's a number
                if (!isNaN(km)) {
                    totalKm += km;
                    detailsHtml += `<li>${km.toFixed(1)} km</li>`; // List individual run
                }
            });

            detailsHtml += `</ul><strong>Total: ${totalKm.toFixed(1)} km</strong>`;
            selectedDayInfoDiv.innerHTML = detailsHtml; // Use innerHTML to render the list
            console.log(`   Found ${runsOnThisDate.length} run(s) for this date. Total: ${totalKm} km`);

        } else {
            selectedDayInfoDiv.textContent = `No run logged for ${clickedDateStr}.`;
            console.log(`   No runs found for this date.`);
        }
    }


    // --- Data Fetching and Saving ---

    // Load runs: Fetches data and calls updateCalendarMarkers
    async function loadRuns() {
        if (!supabaseClient) {
             setStatus('Supabase client not available.', true);
             return;
        }
        console.log('Loading runs...');
        try {
            const { data, error } = await supabaseClient
                .from('runs')
                .select('date, kilometers')
                // Order by date, then potentially by another field like 'created_at' if you add it
                .order('date', { ascending: false });

            if (error) throw error;

            console.log('Runs loaded:', data);
            allRuns = data || []; // Update the master list of runs
             // Ensure calendar is ready before updating markers
             if (jsCalendarInstance) {
                  updateCalendarMarkers(); // Update the markers on the calendar
             } else {
                  console.log("Calendar not ready yet, markers will be updated after init.");
             }

        } catch (error) {
            console.error('Error loading runs:', error);
            setStatus(`Error loading runs: ${error.message}`, true);
        }
    }

    // Save function remains largely the same, calls loadRuns which triggers updateCalendarMarkers
    async function saveRun(date, kilometers) {
         if (!supabaseClient) {
             setStatus('Supabase client not available.', true);
             return;
         }
        console.log(`Saving run: ${date}, ${kilometers} km`);
        setStatus('Saving run...');

        // Added existence check for kilometers
        if (!date || !kilometers || kilometers <= 0) {
            setStatus('Please provide a valid date and positive kilometers.', true);
            return;
        }

        try {
            // Note: This still inserts a *new* row. It doesn't prevent multiple runs on the same date
            // unless you have a unique constraint on the 'date' column in Supabase.
            const { data, error } = await supabaseClient
                .from('runs')
                .insert([{ date: date, kilometers: kilometers }])
                .select();

            if (error) {
                 // Handle unique constraint if you add one later
                 if (error.code === '23505') {
                     setStatus(`A run for ${date} already exists. (Update/Add multiple not implemented).`, true);
                 } else {
                     throw error;
                 }
            } else {
                console.log('Run saved:', data);
                setStatus('Run saved successfully!');
                if(runForm) runForm.reset();
                 if(runDateInput) runDateInput.valueAsDate = new Date();
                loadRuns(); // Reload runs --> which will update allRuns and markers
            }
        } catch (error) {
            console.error('Error saving run:', error);
            setStatus(`Error saving run: ${error.message}`, true);
        }
    }

    // --- Event Listeners ---
    if (runForm) {
        runForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const date = runDateInput.value;
            const km = parseFloat(runKmInput.value);
            saveRun(date, km);
        });
    } else {
        console.error("Run form not found!");
    }

    // --- Initial Load ---
    if(runDateInput) runDateInput.valueAsDate = new Date();

    // First, try to set up the calendar structure
    const calendarReady = setupCalendar();

    // Then, load data (if Supabase and calendar setup were successful)
    if (supabaseClient && calendarReady) {
        loadRuns();
    } else if (!supabaseClient) {
        // Status message is already set during initialization if config fails
        console.error("Application could not start. Check Supabase configuration in config.js.");
    } else {
         console.error("Calendar setup failed, cannot load run data into it.");
    }

}); // End DOMContentLoaded
