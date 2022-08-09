let account;
let maxSaleAmount = 0;
let mintPrice = 0;
let mintStartBlockNumber = 0;
let mintLimitPerBlock = 0;

let galleryLoaded = false; 

let blockNumber = 0;
let blockCnt = false;

let myContract = null; 


/**
 * Custom sleep mathod. 
 * 
 * @param {int} ms 
 * @returns new Promise to give a setTimeout of given ms. 
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms)); 
}

/**
 * Updates cntBlockNumber by +1 per 1 second. 
 */
function cntBlockNumber() {
    if(!blockCnt) {
        setInterval(function(){
            blockNumber+=1;
            document.getElementById("blockNumber").innerHTML = `<span style="color: #f8f8f8">Current Block Height:</span><br/><strong>#${blockNumber}</strong>`;
        }, 1000);
        blockCnt = true;
    }
}

/**
 * Connects Kaikas wallet information to the website. Updates wallet address and balance of the user. 
 * It then calls check_status() function. 
 * @returns null and ends the function when it cannot connect to Klaytn Network. 
 */
async function connect() {
    const accounts = await klaytn.enable();

    if (klaytn.networkVersion === 8217) {
        console.log("MainNet");
    } else if (klaytn.networkVersion === 1001) {
        console.log("Baobab TestNet");
    } else {
        alert("ERROR: Cannot connect to Klaytn Network");
        return;
    }

    account = accounts[0];
    caver.klay.getBalance(account)
        .then(function (balance) {
            document.getElementById("myWallet").innerHTML = `<span style="color: #f8f8f8">Wallet Address:</span><br/><strong>${account}</strong>`
            document.getElementById("myKlay").innerHTML = `<span style="color: #f8f8f8">Balance:</span><br/><strong>${caver.utils.fromPeb(balance, "KLAY")} KLAY</strong>`
        });

        document.getElementsByClassName("connect").style.backgroundColor = C0B69F; 
        document.getElementsByClassName("connect").style.color = F0F0F0; 
    await check_status();
}

/**
 * Brings the Joonyone smart contract and checks starting block height for minting sale. 
 * Then it enables the website to load gallery information through galleryLoad(). Prints out an error 
 * on console.log if there is issue with receiving minting information from the smart contract. 
 */
async function check_status() {
    myContract = new caver.klay.Contract(ABI, CONTRACTADDRESS);
    await myContract.methods.mintingInformation().call()
        .then(function (result) {
            console.log(result);
            mintStartBlockNumber = parseInt(result[1]);
            document.getElementById("mintStartBlockNumber").innerHTML = `<span style="color: #f8f8f8">Starting Block Height:</span><br/><strong>#${mintStartBlockNumber}</strong>`;
        })
        .catch(function (error) {
            console.log(error);
        });
    blockNumber = await caver.klay.getBlockNumber();
    document.getElementById("blockNumber").innerHTML = `<span style="color: #f8f8f8">Current Block Height:</span><br/><strong>#${blockNumber}</strong>`;
    cntBlockNumber();
    galleryLoad(); 
}

/**
 * Fetches the json URL that includes gallery information from Joonyone smart contract, 
 * and display all artworks on the website. 
 */
async function galleryLoad() {
    if (!galleryLoaded) {
        await myContract.methods.mintingInformation().call()
            .then(function (result) {
                console.log(result);
                maxSaleAmount = parseInt(result[2]);
                mintPrice = parseInt(result[3]);
            })
            .catch(function (error) {
                console.log(error);
            });
        
        document.getElementById("notEnabled").remove(); 
        let gallery = document.getElementById("gallery");
        for (let i = 1; i <= maxSaleAmount; i++) {
            await myContract.methods.tokenURI(i).call()
                .then(function (result) {
                    console.log(result);
                    let proxyUrl =  'https://fierce-tundra-18149.herokuapp.com/'; // Heroku proxy url to prevent no-cors error 
                    let targetUrl = 'https://gateway.pinata.cloud/ipfs' + result.substring(6); // pinata gateway to access ipfs 

                    let finalUrl = proxyUrl + targetUrl; 
                    fetch(finalUrl)
                        .then((response) => {
                            return response.json(); 
                        })
                        
                        .then((data) => {
                            
                            let artwork = document.createElement('div'); 
                            artwork.style.width = "380px"; 
                            artwork.style.margin = "20px 10px"; 

                            let link = 'https://gateway.pinata.cloud/ipfs' + data.image.substring(6); // pinata gateway to access ipfs
                            let img = document.createElement('img');
                            img.src = link; 
                            img.style.width = "100%";
                            img.style.border = "2px solid #c0b69f";

                            
                            let title = document.createElement('h3'); 
                            title.innerHTML = data.name; 

                            let price = document.createElement('p'); 
                            price.setAttribute("class", "price");
                            price.innerHTML = `${caver.utils.fromPeb(mintPrice, "KLAY")} KLAY`; 

                            let mintButton = document.createElement('button');
                            mintButton.setAttribute("class", "mint"); 
                            mintButton.innerHTML = 'Mint!'; 
                            mintButton.addEventListener("click", function() {
                                publicMint(i);
                            }, false);


                            artwork.appendChild(img); 
                            artwork.appendChild(title); 
                            artwork.appendChild(price);
                            artwork.appendChild(mintButton); 

                            gallery.appendChild(artwork); 
                    
                        })
                        
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
        await sleep(200);
        galleryLoaded = true; 
    }
}

/**
 * publicMint is the function where when called, allows users to mint the 
 * selected artwork (tokenID).  
 *  
 * @param {int} tokenID  
 */
async function publicMint(tokenID) {
    if (klaytn.networkVersion === 8217) {
        console.log("MainNet");
    } else if (klaytn.networkVersion === 1001) {
        console.log("Baobab TestNet");
    } else {
        alert("ERROR: Cannot connect to Klaytn Network!");
        return;
    }

    if (!account) {
        alert("ERROR: Connect your Klaytn Wallet!");
        return;
    }

    myContract = new caver.klay.Contract(ABI, CONTRACTADDRESS);
    await check_status();
    if (blockNumber <= mintStartBlockNumber) {
        alert("Public Minting isn't open yet.");
        return;
    } 

    await myContract.methods.isMinted(tokenID).call()
            .then(function (sold) {
                console.log(result);
                if (sold) {
                    alert("The selected artwork is already sold."); 
                    return; 
                }
            })
            .catch(function (error) {
                console.log(error);
                alert("ERROR: Something went wrong while verifying!"); 
            });

    const total_value = BigNumber(mintPrice);

    try {
        const gasAmount = await myContract.methods.publicMint(tokenID).estimateGas({
            from: account,
            gas: 6000000,
            value: total_value
        })
        const result = await myContract.methods.publicMint(tokenID).send({
            from: account,
            gas: gasAmount,
            value: total_value
        })
        if (result != null) {
            console.log(result);
            alert("Minting Successful! The artwork NFT is now yours.");
        }
    } catch (error) {
        console.log(error);
        alert("Minting was unsuccessful. Please try again later.");
    }
}