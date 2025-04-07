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
    const resultsContent = document.getElementById('results-content');
    const ethPriceElement = document.getElementById('eth-price');
    const gasGweiElement = document.getElementById('gas-gwei');

    // Variables
    let ethPrice = 0;
    let currentGasPrice = 0;

    // Toggle Advanced Settings
    advancedToggle.addEventListener('change', () => {
        if (advancedToggle.checked) {
            advancedSettings.classList.remove('hidden');
            advancedSettings.classList.add('show');
            // Set default values for advanced mode
            gasStartInput.value = 10;
            gasStepInput.value = 15;
            numRowsInput.value = 15;
        } else {
            advancedSettings.classList.add('hidden');
            advancedSettings.classList.remove('show');
        }
    });

    // Fetch ETH Price from Etherscan
    async function fetchEthPrice() {
        try {
            const response = await fetch('https://api.etherscan.io/api?module=stats&action=ethprice&apikey=UD78IJJMP1G7YVCVRUB8YPVTX9RTR2H5JM');
            const data = await response.json();
            
            if (data && data.status === "1" && data.result) {
                ethPrice = parseFloat(data.result.ethusd);
                
                // Update the UI with integer format
                ethPriceElement.textContent = `${Math.round(ethPrice)}`;
            }
        } catch (error) {
            console.error('Error fetching ETH price:', error);
            // Set fallback value
            ethPrice = 0;
            ethPriceElement.textContent = `${ethPrice}`;
        }
    }
    
    // Fetch Gas Price from Etherscan
    async function fetchGasPrice() {
        try {
            const gasResponse = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=UD78IJJMP1G7YVCVRUB8YPVTX9RTR2H5JM');
            const gasData = await gasResponse.json();
            
            if (gasData && gasData.status === "1" && gasData.result) {
                currentGasPrice = parseFloat(gasData.result.SafeGasPrice);
                
                // Update the UI with X.XX format
                gasGweiElement.textContent = `${currentGasPrice.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error fetching gas price:', error);
            // Set fallback value
            currentGasPrice = 0;
            gasGweiElement.textContent = `${currentGasPrice.toFixed(2)}`;
        }
    }

    // Calculate Gas Fees
    function calculateGasFees() {
        // Get input values
        const mintPrice = parseFloat(mintPriceInput.value) || 0;
        const gasLimit = parseInt(gasLimitInput.value) || 21000;
        const numRows = parseInt(numRowsInput.value) || 15;
        
        // Clear previous results
        resultsContent.innerHTML = '';
        
        // Set up gas prices array
        let gasPrices = [];
        
        // Check if advanced settings are enabled
        if (advancedToggle.checked) {
            const gasStart = parseInt(gasStartInput.value) || 10;
            const gasStep = parseInt(gasStepInput.value) || 15;
            
            // Generate gas prices based on advanced settings
            for (let i = 0; i < numRows; i++) {
                gasPrices.push(gasStart + (i * gasStep));
            }
        } else {
            // Use custom step pattern for default mode
            gasPrices.push(5);  // First value: 5 GWEI
            gasPrices.push(15); // Second value: 15 GWEI
            gasPrices.push(25); // Third value: 25 GWEI
            
            // Continue with 25 increments
            for (let i = 1; i < numRows - 3; i++) {
                gasPrices.push(25 + (i * 25));
            }
        }
        
        // Calculate and display results for each gas price
        for (let i = 0; i < gasPrices.length; i++) {
            const gasPrice = gasPrices[i];
            const transactionCostWei = BigInt(gasLimit) * BigInt(gasPrice) * BigInt(1e9);
            const transactionCostEth = Number(transactionCostWei) / 1e18;
            const totalCostEth = mintPrice + transactionCostEth;
            const balanceNeeded = totalCostEth * 1.25;
            const usdValue = totalCostEth * ethPrice;
            
            // Create a row
            const row = document.createElement('div');
            row.className = 'result-row';
            
            row.innerHTML = `
                <div class="result-item">
                    <span class="gwei-badge">${gasPrice} GWEI</span>
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
        }
    }

    // Initialize
    function init() {
        // Initial fetch
        fetchEthPrice();
        fetchGasPrice();
        
        // Set up interval for updates
        setInterval(fetchEthPrice, 60000); // Update ETH price every minute
        setInterval(fetchGasPrice, 15000); // Update gas price every 15 seconds
    }

    // Event listeners - Only calculate when button is clicked
    calculateBtn.addEventListener('click', calculateGasFees);
    
    // Start the app
    init();
});