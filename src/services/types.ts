export interface Execution {
    _id: number;
    meta: {
        accelerators: {
            gpus: Array<{
                product: string;
                memory: string;
                driver: string;
            }>;
        };
        pytorch: {
            torch: string;
            cuda: string;
        };
        milabench: {
            tag: string;
            version: string;
        };
        system: {
            hostname: string;
            os: string;
            python: string;
        };
        timestamp: string;
    };
    status: string;
    return_code: number;
    walltime: number;
}

export interface Pack {
    _id: number;
    exec_id: number;
    name: string;
    status: string;
    return_code: number;
    walltime: number;
    metrics?: Metric[];
    plot?: string;
}

export interface Metric {
    _id: number;
    exec_id: number;
    pack_id: number;
    name: string;
    value: number;
    unit: string;
    gpu_id: string;
    order: number;
    timestamp: string;
}

export interface Summary {
    [key: string]: {
        [key: string]: number | string;
    };
}

export interface ApiError {
    message: string;
    status: number;
}