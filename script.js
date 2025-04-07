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
    const ethChangeElement = document.getElementById('eth-change');
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
            numRowsInput.value = 50;
        } else {
            advancedSettings.classList.add('hidden');
            advancedSettings.classList.remove('show');
        }
    });

    // Fetch ETH Price and Gas Price
    async function fetchEthData() {
        try {
            // Fetch ETH price data
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
            const data = await response.json();
            
            if (data && data.ethereum) {
                ethPrice = data.ethereum.usd;
                const change24h = data.ethereum.usd_24h_change;
                
                // Update the UI
                ethPriceElement.textContent = `${ethPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                
                const changeText = change24h.toFixed(2);
                ethChangeElement.textContent = `(${changeText}%) 24h`;
                
                if (change24h >= 0) {
                    ethChangeElement.classList.add('price-up');
                    ethChangeElement.classList.remove('price-down');
                } else {
                    ethChangeElement.classList.add('price-down');
                    ethChangeElement.classList.remove('price-up');
                }
            }
            
            // Fetch current gas price (using Etherscan API)
            const gasResponse = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=UD78IJJMP1G7YVCVRUB8YPVTX9RTR2H5JM');
            const gasData = await gasResponse.json();
            
            if (gasData && gasData.result) {
                currentGasPrice = parseFloat(gasData.result.SafeGasPrice);
                gasGweiElement.textContent = `${currentGasPrice.toFixed(2)} Gwei`;
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            // Set fallback values
            ethPrice = 1600;
            currentGasPrice = 2;
            ethPriceElement.textContent = `${ethPrice}`;
            gasGweiElement.textContent = `${currentGasPrice.toFixed(2)} Gwei`;
        }
        
        // Initial calculation
        calculateGasFees();
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
            
            // Start the pattern from 25 GWEI with 25 steps
            const step = 25;
            for (let i = 0; i < numRows - 2; i++) {
                gasPrices.push(25 + (i * step));
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
                    <span class="gwei-value">${gasPrice} GWEI</span>
                </div>
                <div class="result-item">
                    <div>
                        <span class="eth-value">Transaction: ${totalCostEth.toFixed(6)} ETH</span>
                        <span class="usd-value">${usdValue.toFixed(2)}</span>
                    </div>
                    <div style="margin-top: 8px;">
                        <span class="eth-value">Balance needed: ${balanceNeeded.toFixed(6)} ETH</span>
                        <span class="usd-value">${(balanceNeeded * ethPrice).toFixed(2)}</span>
                    </div>
                </div>
            `;
            
            resultsContent.appendChild(row);
        }
    }

    // Event listeners
    calculateBtn.addEventListener('click', calculateGasFees);
    
    // Initialize
    fetchEthData();
    
    // Update ETH price every 60 seconds
    setInterval(fetchEthData, 60000);
});