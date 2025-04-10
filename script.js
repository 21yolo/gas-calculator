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

    // Variables
    let ethPrice = null;
    let ethPriceChange = null;
    let gasGwei = null;
    
    // Constants for API refresh rates (in milliseconds)
    const GWEI_REFRESH_RATE = 10000; // 10 seconds
    const ETH_PRICE_REFRESH_RATE = 30000; // 30 seconds
    const PRICE_CHANGE_REFRESH_RATE = 900000; // 15 minutes
    
    // Initialize
    function init() {
        // Initial fetch
        fetchGasPrice();
        fetchEthPrice();
        fetchPriceChange();
        
        // Set up intervals for refreshing data with different rates
        setInterval(fetchGasPrice, GWEI_REFRESH_RATE);
        setInterval(fetchEthPrice, ETH_PRICE_REFRESH_RATE);
        setInterval(fetchPriceChange, PRICE_CHANGE_REFRESH_RATE);
        
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
    
    // Fetch ETH Price from Etherscan
    async function fetchEthPrice() {
        try {
            const response = await fetch(
                'https://api.etherscan.io/api?module=stats&action=ethprice&apikey=UD78IJJMP1G7YVCVRUB8YPVTX9RTR2H5JM'
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.status === "1" && data.result) {
                ethPrice = parseFloat(data.result.ethusd);
                
                // Update the UI
                ethPriceElement.textContent = Math.round(ethPrice);
            } else {
                console.error('Invalid response format from Etherscan ETH price:', data);
            }
        } catch (error) {
            console.error('Error fetching ETH price from Etherscan:', error);
        }
    }
    
    async function fetchPriceChange() {
        try {
            console.log('Fetching price change from CoinGecko...');
            
            const options = {
                method: 'GET',
                headers: {
                    'accept': 'application/json', 
                    'x-cg-demo-api-key': 'CG-VdN9BevdKrni5bPV6TE4WTxM'
                }
            };
            
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_market_cap=false&include_24hr_vol=false&include_24hr_change=true&include_last_updated_at=false&precision=0',
                options
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('CoinGecko response:', data);
            
            if (data && data.ethereum && data.ethereum.usd_24h_change !== undefined) {
                ethPriceChange = data.ethereum.usd_24h_change;
                console.log('24h price change:', ethPriceChange);
                
                // Update price change indicator - UPDATED FORMATTING
                const isPositive = ethPriceChange >= 0;
                // Format with parentheses around the value and always show sign
                ethPriceChangeElement.textContent = `(${isPositive ? '+' : ''}${ethPriceChange.toFixed(2)}%)`;
                ethPriceChangeElement.classList.remove('hidden', 'positive', 'negative');
                ethPriceChangeElement.classList.add(isPositive ? 'positive' : 'negative');
            } else {
                console.error('Invalid response format from CoinGecko or missing 24h change:', data);
                ethPriceChangeElement.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error fetching price change from CoinGecko:', error);
            ethPriceChangeElement.classList.add('hidden');
        }
    }
    
    // Fetch Gas Price from Etherscan
    async function fetchGasPrice() {
        try {
            const response = await fetch(
                'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=UD78IJJMP1G7YVCVRUB8YPVTX9RTR2H5JM'
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.status === "1" && data.result) {
                gasGwei = parseFloat(data.result.SafeGasPrice);
                
                // Update the UI
                gasGweiElement.textContent = gasGwei.toFixed(2);
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
            // Default gas prices - UPDATED to include 10 GWEI
            gasPrices.push(5);  // First value: 5 GWEI
            gasPrices.push(10); // New second value: 10 GWEI
            gasPrices.push(15); // Third value: 15 GWEI
            gasPrices.push(25); // Fourth value: 25 GWEI
            
            // Continue with 25 increments
            for (let i = 1; i < numRows - 4; i++) { // Adjusted for 4 initial values instead of 3
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
    
    // Helper function to display GWEI values properly - FIXED to handle integers
    function displayGweiValue(value) {
        // Check if the value is actually an integer
        if (Number.isInteger(value)) {
            return value.toString(); // Return as integer with no decimal places
        }
        // For extremely small values, display up to 5 decimal places
        else if (value < 0.01) {
            return value.toFixed(5);
        }
        // For small values, display up to 3 decimal places
        else if (value < 1) {
            return value.toFixed(3);
        }
        // For values between 1 and 10, display 2 decimal places
        else if (value < 10) {
            return value.toFixed(2);
        }
        // For larger decimal values, display as integers
        else {
            // If very close to an integer (within 0.001), round to integer
            if (Math.abs(Math.round(value) - value) < 0.001) {
                return Math.round(value).toString();
            } else {
                return value.toFixed(2);
            }
        }
    }

    // Start the app
    init();
});