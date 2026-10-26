package com.globalnet.assetguard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class AssetGuardApplication {

    public static void main(String[] args) {
        SpringApplication.run(AssetGuardApplication.class, args);
    }
}
