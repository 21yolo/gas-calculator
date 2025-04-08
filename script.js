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
    
    // Fetch 24h Price Change from CoinGecko (infrequently)
    async function fetchPriceChange() {
        try {
            // Use the CoinGecko API with proper header authentication
            const options = {
                method: 'GET',
                headers: {
                    'accept': 'application/json', 
                    'x-cg-demo-api-key': 'CG-VdN9BevdKrni5bPV6TE4WTxM'
                }
            };
            
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24h_change=true',
                options
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.ethereum && data.ethereum.usd_24h_change !== undefined) {
                ethPriceChange = data.ethereum.usd_24h_change;
                
                // Update price change indicator
                const isPositive = ethPriceChange >= 0;
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
            // Default gas prices
            gasPrices.push(5);  // First value: 5 GWEI
            gasPrices.push(15); // Second value: 15 GWEI
            gasPrices.push(25); // Third value: 25 GWEI
            
            // Continue with 25 increments
            for (let i = 1; i < numRows - 3; i++) {
                gasPrices.push(25 + (i * 25));
            }
        }
        
        // Calculate and display results for each gas price
        gasPrices.forEach(gasPrice => {
            // Calculate transaction cost in ETH
            const transactionCostWei = BigInt(gasLimit) * BigInt(gasPrice) * BigInt(1e9);
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
        });
        
        // Show results
        resultsCard.classList.remove('hidden');
    }

    // Start the app
    init();
});