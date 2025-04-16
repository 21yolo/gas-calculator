document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const mintPriceInput = document.getElementById('mint-price');
    const gasLimitInput = document.getElementById('gas-limit');
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedSettings = document.getElementById('advanced-settings');
    const gasStartInput = document.getElementById('gas-start');
    const gasStepInput = document.getElementById('gas-step');
    const numRowsInput = document.getElementById('num-rows');
    const calculateBtn = document.getElementById('calculate-btn');
    const resultsCard = document.getElementById('results-card');
    const resultsContent = document.getElementById('results-content');
    const ethPriceElement = document.getElementById('eth-price');
    const gasGweiElement = document.getElementById('gas-gwei');
    const ethPriceChangeElement = document.getElementById('eth-price-change');
    const priceContainer = document.querySelector('.price-container');

    // Variables
    let ethPrice = null;
    let ethPriceChange = null;
    let gasGwei = null;
    let initialDataLoaded = false;
    
    // Constants for API refresh rates (in milliseconds)
    const GWEI_REFRESH_RATE = 10000; // 10 seconds
    const ETH_PRICE_REFRESH_RATE = 30000; // 30 seconds
    
    // Initialize
    function init() {
        // Hide price elements until data is loaded
        priceContainer.classList.add('hidden');
        
        // Initial fetch
        fetchGasPrice();
        fetchEthPrice();
        
        // Set up intervals for refreshing data with different rates
        setInterval(fetchGasPrice, GWEI_REFRESH_RATE);
        setInterval(fetchEthPrice, ETH_PRICE_REFRESH_RATE);
        
        // Event listeners
        advancedToggle.addEventListener('change', toggleAdvancedSettings);
        calculateBtn.addEventListener('click', calculateGasFees);
        
        // Add input validation for all number inputs
        setupInputValidation();
    }
    
    // Setup validation for inputs to prevent negative values and allow proper decimal separators
    function setupInputValidation() {
        const numberInputs = [mintPriceInput, gasLimitInput, gasStartInput, gasStepInput, numRowsInput];
        
        numberInputs.forEach(input => {
            if (!input) return; // Skip if element doesn't exist
            
            // Enforce minimum value of 0
            input.min = "0";
            
            // Add input event listener to validate as user types
            input.addEventListener('input', function(e) {
                // Replace commas with periods for decimal handling
                if (this.value.includes(',')) {
                    this.value = this.value.replace(',', '.');
                }
                
                // Parse as float to properly handle decimals
                const value = parseFloat(this.value);
                
                // Check if negative and correct
                if (value < 0) {
                    this.value = "0";
                }
            });
        });
    }
    
    // Toggle Advanced Settings
    function toggleAdvancedSettings() {
        if (advancedToggle.checked) {
            advancedSettings.classList.remove('hidden');
        } else {
            advancedSettings.classList.add('hidden');
        }
    }
    
    // Function to check if both values are loaded and update display
    function checkAndUpdateDisplay() {
        if (ethPrice !== null && gasGwei !== null && !initialDataLoaded) {
            // Small delay to ensure smooth transition
            setTimeout(() => {
                // All data is loaded, show the price container
                priceContainer.classList.remove('hidden');
                initialDataLoaded = true;
            }, 500); // 0.5 second delay for smooth appearance
        }
    }
    
    // Fetch ETH Price and price change from CoinGecko
    async function fetchEthPrice() {
        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum&price_change_percentage=24h'
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                // Update ETH price
                ethPrice = parseFloat(data[0].current_price);
                ethPriceElement.textContent = Math.round(ethPrice);
                
                // Update price change
                ethPriceChange = parseFloat(data[0].price_change_percentage_24h);
                
                // Update price change indicator
                const isPositive = ethPriceChange >= 0;
                ethPriceChangeElement.textContent = `(${isPositive ? '+' : ''}${ethPriceChange.toFixed(2)}%)`;
                ethPriceChangeElement.classList.remove('hidden', 'positive', 'negative');
                ethPriceChangeElement.classList.add(isPositive ? 'positive' : 'negative');
                
                // Trigger display update if both values are loaded
                checkAndUpdateDisplay();
            } else {
                console.error('Invalid response format from CoinGecko:', data);
            }
        } catch (error) {
            console.error('Error fetching ETH price from CoinGecko:', error);
        }
    }
    
    // Fetch Gas Price from Etherscan without API key
    async function fetchGasPrice() {
        try {
            const response = await fetch(
                'https://api.etherscan.io/api?module=gastracker&action=gasoracle'
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.status === "1" && data.result) {
                gasGwei = parseFloat(data.result.SafeGasPrice);
                
                // Update the UI with 3 decimal places
                gasGweiElement.textContent = gasGwei.toFixed(3);
                
                // Trigger display update if both values are loaded
                checkAndUpdateDisplay();
            } else {
                console.error('Invalid response format from Etherscan gas price:', data);
            }
        } catch (error) {
            console.error('Error fetching gas price from Etherscan:', error);
        }
    }

    // Calculate Gas Fees
    function calculateGasFees() {
        // Don't calculate if we don't have ETH price data yet
        if (!ethPrice) {
            alert("Waiting for current ETH price data. Please try again in a moment.");
            return;
        }
        
        // Get input values with proper validation
        const mintPrice = Math.max(0, parseFloat(mintPriceInput.value) || 0);
        const gasLimit = Math.max(21000, parseInt(gasLimitInput.value) || 21000);
        const numRows = Math.max(5, Math.min(30, parseInt(numRowsInput.value) || 15));
        
        // Update input values with validated values
        mintPriceInput.value = mintPrice;
        gasLimitInput.value = gasLimit;
        numRowsInput.value = numRows;
        
        // Clear previous results
        resultsContent.innerHTML = '';
        
        // Set up gas prices array
        let gasPrices = [];
        
        // Check if advanced settings are enabled
        if (advancedToggle.checked) {
            // Use parseFloat instead of parseInt to support decimal values
            const gasStart = Math.max(0, parseFloat(gasStartInput.value) || 10);
            const gasStep = Math.max(0, parseFloat(gasStepInput.value) || 15);
            
            // Update input values with validated values
            gasStartInput.value = roundToDecimalPlaces(gasStart, 5);
            gasStepInput.value = roundToDecimalPlaces(gasStep, 5);
            
            // Generate gas prices based on advanced settings
            for (let i = 0; i < numRows; i++) {
                // Round to 5 decimal places to prevent floating point issues
                const gasPrice = roundToDecimalPlaces(gasStart + (i * gasStep), 5);
                gasPrices.push(gasPrice);
            }
        } else {
            // Default gas prices
            gasPrices.push(5);  // First value: 5 GWEI
            gasPrices.push(10); // Second value: 10 GWEI
            gasPrices.push(15); // Third value: 15 GWEI
            gasPrices.push(25); // Fourth value: 25 GWEI
            
            // Continue with 25 increments
            for (let i = 1; i < numRows - 4; i++) { // Adjusted for 4 initial values
                gasPrices.push(25 + (i * 25));
            }
        }
        
        // Calculate and display results for each gas price
        gasPrices.forEach(gasPrice => {
            // Calculate transaction cost in ETH
            const transactionCostWei = BigInt(gasLimit) * BigInt(Math.round(gasPrice * 1e9));
            const transactionCostEth = Number(transactionCostWei) / 1e18;
            
            // Calculate total cost and balance needed
            const totalCostEth = mintPrice + transactionCostEth;
            const balanceNeeded = totalCostEth * 1.25; // 25% buffer
            const usdValue = totalCostEth * ethPrice;
            
            // Create a row for the result
            const row = document.createElement('div');
            row.className = 'result-row';
            
            row.innerHTML = `
                <div class="result-item">
                    <span class="gwei-badge">${displayGweiValue(gasPrice)} GWEI</span>
                </div>
                <div class="result-item">
                    <span>${totalCostEth.toFixed(5)} ETH</span>
                </div>
                <div class="result-item">
                    <span>${balanceNeeded.toFixed(5)} ETH</span>
                </div>
                <div class="result-item">
                    <span>$${usdValue.toFixed(2)}</span>
                </div>
            `;
            
            resultsContent.appendChild(row);
        });
        
        // Show results
        resultsCard.classList.remove('hidden');
    }
    
    // Helper function to round to a specific number of decimal places
    function roundToDecimalPlaces(num, places) {
        return Math.round(num * Math.pow(10, places)) / Math.pow(10, places);
    }
    
    // Helper function to display GWEI values properly with updated precision
    function displayGweiValue(value) {
        // Check if the value is actually an integer
        if (Number.isInteger(value)) {
            return value.toString(); // Return as integer with no decimal places
        }
        // For extremely small values, display up to 5 decimal places
        else if (value < 0.01) {
            return value.toFixed(5);
        }
        // For small values, display up to 3 decimal places (updated from 3 to match requirement)
        else if (value < 1) {
            return value.toFixed(3);
        }
        // For values between 1 and 10, display 3 decimal places (updated from 2 to match requirement)
        else if (value < 10) {
            return value.toFixed(3);
        }
        // For larger values, adjust precision
        else {
            // If very close to an integer (within 0.001), round to integer
            if (Math.abs(Math.round(value) - value) < 0.001) {
                return Math.round(value).toString();
            } else {
                return value.toFixed(3); // Updated to 3 decimal places consistently
            }
        }
    }

    // Start the app
    init();
});