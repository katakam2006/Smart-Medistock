const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Hemasrikotha@07',
    database: 'smart_medistock',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const db = pool.promise();

// Mapping of user ID to their original hashed password from the first screenshot
const hashes = {
    1: '30efef8d484671fd091fdf52fb2ccad2:8a45dab48a5c9187a089a91ef4d9281c8646ce189fb1f84707070393fa4a588c78258161704b6c4fd2e8d748f03ac7a9334953158cb0ee1ffafff911fa852c2e',
    3: 'd2201ec706697d5a9424d371981e90ff:ee06bd72cdffbc0f8f4a38738801853948c117dcfd440268abf0faad899fb445e0314c1a074b5d3485407789b55df72f0e37e6169d0bb1557a5a1459ab3da84',
    5: '31e824ad231808f833a518458f25d863:d2e23fef59cc6a97ed536df6e356456d8cff82f8ceb8a7a5bff61a335bc7162387c99e0f9180d5ad44dba1132a66ee75ca89c0af573181086dfefd844100',
    8: '41fb5a0695c2c2d286bbda91927cd97:c895da712eba4e8ddbb115cd1a571239594ae87a263d82e8de2bddf6dbe7124691f4e354ad03851a69b0e22781a4b7178c17e46dc761b4760aa0ef2d8df1',
    9: 'Hema@07', // Keep Hema as Hema@07 in plain text as requested
    10: 'ffb8551cd5d8d3cda141404dc3fcf837:3862df1591737a58e04bd78a8cdca7aa9bed8848d985e7bef41648925d0341bc11c6de753409b1d2b6303b1d59138eb3f48eca0192b2ca1bd353716f3f9c4be',
    11: 'f378205687be926c7ed98dcc55a81fc:ca848d7ed71673523931f212a9880786b8ebf99d6b9fcd591d9b2aad3ca83452e17eb16d7b947c16a7677b68109964c14d381a99cff86c057b7d57782ea831',
    12: 'f123827936ff0d17950299a33e88177e:1b9c82284b2c139fa03655d686483374d56788cc8b8d0444b482082e5b4bd7895b94360c7dd3d8d36e1903535ec9780430c8862fa9ac1df8b2552841eb56d7',
    13: '97aae69b49e2d1fe3f875225fd5ab1bf:8dc17afb08cefd27300ff23890afafb97a6d97e4301082421c19c8e7b120b66c8724165ed6e35744e01dac3b2b9144ea16c35e340fcd6a0fd6e2e8d6a5c3',
    16: '894edc48d297f8bc902dbad4b48eb2f6:31ed9868a537893b0ea58df225a265b8236c398c49fbb8164ea65bc4e520cc8b21fdabe48548f8ec4a4d9883b26901a7937398eff0118028f7bde375',
    17: '76484fee5657aed74aac0b5a3e4fd847:f24a77ff7a90c18eb32a3794d658288f7335c79adcc2086c1b547b39bd978a13c949f68473551ebf99aa42e2c8722ff9bf36feeb8f31746ec643dea69abf5143',
    18: '6f8aafc81e28b4881ef428f2a32d477:13ca2973fe916f03477719d7262a891d64da847a4b3c7cae15292030abedd791c761043c8ceccd724b44a5815d4dde99cc7fdcba12a98e25f3e2ceffc3f',
    22: '764b80eb8a1ba67ae5f77487eda02a5:58c338875d101ad6cdd69cbe9551d82fb2342b0ce45a372f3ebeceb4457a2f65d1495dcfbcda9df8115c1b5269e1b2ead03de3cfe9bd588632d9cb23cdb',
    24: '65a5b2575c781183075108f1681cea83:4fb6e36c358645b11e09cec489c2a343537221a77979f45c98e8da3457cc99bd3d62d2c281232f43077fa27fea81ea36825fb83f46ffbc0f424afda1137cc8',
    25: '3453dfe63193ebdfbec20bae214d3847:4a49b12f475a1f95e0b3d6173b7ed2272438904d78bde1049ebd8d8fd99ffdb219c5587ce7e5e9e2f74a66138d8fea7a3d55281b761816825d939de71d',
    27: '178ff105f9e24dfd949f87bd046cb740:68ed40dde1fbb1eeabf246524215c2cca612fa89928ca168cb39426b388f747f47e14a045d8dedc1c5428519fd1c379862024d8a16cff685a7831a794b37f',
    28: 'd6a9953c31db6f5f9413e9f6a4cff68b:48845e3c5e2ab9fa70fdeafc848292fa9385ba93ce49d4f0f3ae1e0932a4e8fe3fd844f886559f874f34b741294ecaf09c2267703a44d0632d5a032a885',
    29: '7a4557619938d0a82623ef73a786194:1d5916242a22a7a357b610a823911585634d267b2c7b52c36a795cf62f8bd54ffc2a4ac0d9092621082c638c89a08a1ef18528c8d44271ce927139a8fcbe4'
};

async function restoreOriginalHashes() {
    try {
        console.log("Restoring original hashes to the database...");
        for (const [id, hash] of Object.entries(hashes)) {
            await db.query("UPDATE users SET password = ? WHERE id = ?", [hash, id]);
            console.log(`Restored password for user ID ${id}`);
        }
        console.log("✅ All original password hashes successfully restored!");
    } catch (err) {
        console.error("Error restoring hashes:", err);
    } finally {
        pool.end();
    }
}

restoreOriginalHashes();
