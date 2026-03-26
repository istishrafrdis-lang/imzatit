const Web3 = require('web3');

class BlockchainService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.isInitialized = false;
    }

    // تهيئة الاتصال بالبلوكتشين
    async initialize(network = 'bsc-testnet') {
        try {
            const rpcUrl = network === 'bsc-mainnet' 
                ? 'https://bsc-dataseed.binance.org/' 
                : 'https://data-seed-prebsc-1-s1.binance.org:8545/';
            
            this.web3 = new Web3(rpcUrl);
            this.isInitialized = true;
            
            console.log(`✅ متصل بشبكة ${network}`);
            return true;
            
        } catch (error) {
            console.error('❌ فشل اتصال البلوكتشين:', error.message);
            return false;
        }
    }

    // إنشاء محفظة جديدة
    createWallet() {
        try {
            const account = this.web3.eth.accounts.create();
            return {
                address: account.address,
                privateKey: account.privateKey
            };
        } catch (error) {
            console.error('خطأ في إنشاء المحفظة:', error);
            return null;
        }
    }

    // إرسال عملة TIT
    async sendTIT(fromPrivateKey, toAddress, amount) {
        if (!this.isInitialized) await this.initialize();

        try {
            const account = this.web3.eth.accounts.privateKeyToAccount(fromPrivateKey);
            const tx = {
                from: account.address,
                to: toAddress,
                value: this.web3.utils.toWei(amount.toString(), 'ether'),
                gas: 21000,
                gasPrice: await this.web3.eth.getGasPrice()
            };

            const signedTx = await account.signTransaction(tx);
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber
            };
            
        } catch (error) {
            console.error('خطأ في إرسال TIT:', error);
            return { success: false, error: error.message };
        }
    }

    // الحصول على رصيد المحفظة
    async getBalance(address) {
        if (!this.isInitialized) await this.initialize();

        try {
            const balance = await this.web3.eth.getBalance(address);
            return {
                success: true,
                balance: this.web3.utils.fromWei(balance, 'ether')
            };
        } catch (error) {
            console.error('خطأ في جلب الرصيد:', error);
            return { success: false, error: error.message };
        }
    }

    // سك عملة TIT (للمشرفين فقط)
    async mintTIT(fromPrivateKey, toAddress, amount) {
        if (!this.isInitialized) await this.initialize();

        try {
            // هنا سيتم استدعاء العقد الذكي لسك العملة
            // مؤقتاً نستخدم تحويل مباشر
            return await this.sendTIT(fromPrivateKey, toAddress, amount);
            
        } catch (error) {
            console.error('خطأ في سك TIT:', error);
            return { success: false, error: error.message };
        }
    }

    // حرق عملة TIT
    async burnTIT(fromPrivateKey, amount) {
        if (!this.isInitialized) await this.initialize();

        try {
            const account = this.web3.eth.accounts.privateKeyToAccount(fromPrivateKey);
            // إرسال إلى عنوان محترق (0x000...000)
            const burnAddress = '0x0000000000000000000000000000000000000000';
            
            const tx = {
                from: account.address,
                to: burnAddress,
                value: this.web3.utils.toWei(amount.toString(), 'ether'),
                gas: 21000,
                gasPrice: await this.web3.eth.getGasPrice()
            };

            const signedTx = await account.signTransaction(tx);
            const receipt = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
            
            return {
                success: true,
                transactionHash: receipt.transactionHash,
                amountBurned: amount
            };
            
        } catch (error) {
            console.error('خطأ في حرق TIT:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new BlockchainService();
