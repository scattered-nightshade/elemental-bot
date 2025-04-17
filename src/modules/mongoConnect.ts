import mongoose from 'mongoose';

export default async function mongoConnect(): Promise<void> {
    const connectionUri: string | undefined = process.env.MONGODB_URI;

    if (!connectionUri) throw new Error('No MongoDB URI provided!');

    try {
        await mongoose.connect("mongodb://root:example@hermes:27017/elementalbot?authSource=admin")
        console.log('MongoDB connected successfully!');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}
