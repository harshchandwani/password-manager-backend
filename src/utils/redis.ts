import { createClient, RedisClientType } from "redis";


class Redis {
    private static instance: Redis;
    private redisClient!: RedisClientType;
    private consumerClient!: RedisClientType;

    private constructor() {
        try {
            this.redisClient = createClient({
                url: process.env.REDIS_URL,
                password: process.env.REDIS_PASSWORD,
                username: process.env.REDIS_USER,
                pingInterval: 30000,
                socket: {
                    keepAlive: 3000,
                },
            });
            this.consumerClient = createClient({
                url: process.env.REDIS_URL,
                password: process.env.REDIS_PASSWORD,
                username: process.env.REDIS_USER,
                pingInterval: 30000,
                socket: {
                    keepAlive: 3000,
                },
            });

            this.redisClient.connect().catch((err) => console.error("Redis Client Connection Error", err));
            this.consumerClient.connect().catch((err) => console.error("Redis Consumer Client Connection Error", err));

            this.redisClient.on("error", (err) => console.error("Redis Client Error", err));
            this.consumerClient.on("error", (err) => console.error("Redis Consumer Client Error", err));
        } catch (error) {
            console.error("Redis Initialization Error", error);
        }
    }

    public static getInstance() {
        if (!Redis.instance) {
            Redis.instance = new Redis();
        }
        return Redis.instance;
    }

    public async ping() {
        return await this.redisClient.ping();
    }

    public async addToQueue(key: string, value: object) {
        await this.redisClient.lPush(`password_manager:${key}`, JSON.stringify(value));
    }

    public async consumeFromQueue(key: string) {
        const value = await this.consumerClient.brPop(`password_manager:${key}`, 0);
        if (!value) {
            return null;
        }
        return JSON.parse(value.element);
    }

    public async disconnect() {
        await this.redisClient.quit();
        await this.consumerClient.quit();
    }
}

export default Redis;
