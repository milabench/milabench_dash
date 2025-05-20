export interface Execution {
    _id: number;
    meta: {
        cpu: {
            brand: string;
            count: number;
            
        };
        accelerators: {
            gpus: Array<{
                product: string;
                memory: string;
                driver: string;
            }>;
            system: {
                CUDA_DRIVER: string;
                DRIVER_VERSION: string;
                HIC_DRIVER: string;
                NVML_VERSION: string;
            };
        };
        os: {
            machine: string;
            sysname: string;
            release: string;
        };
        pytorch: {
            torch: string;
            build_settings: {
                TORCH_VERSION: string;
                CUDA_VERSION: string;
                CUDNN_VERSION: string;
            };
        };
        milabench: {
            tag: string;
            commit: string;
            date: string;
        };
        system: {
            hostname: string;
            os: string;
            python: string;
        };
        timestamp: string;
    };
    name: string;
    namespace: string;
    status: string;
    created_time: string;
}

export interface Pack {
    _id: number;
    exec_id: number;
    created_time: string;
    name: string;
    tag: string;
    config: [key: string],
    command: [key: string]
}

export interface Metric {
    _id: number;
    exec_id: number;
    pack_id: number;
    
    order: number;

    name: string;
    namespace: string;
    value: number;
    unit: string;

    gpu_id: string;
    job_id: string;

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