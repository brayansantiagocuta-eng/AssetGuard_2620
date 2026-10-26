package com.globalnet.assetguard.infrastructure.scheduling;

import com.globalnet.assetguard.application.OverdueJobService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Dispara la tarea de vencimientos a la medianoche de Bogota (RF-012). */
@Component
public class OverdueJobScheduler {

    private static final Logger LOGGER = LoggerFactory.getLogger(OverdueJobScheduler.class);

    private final OverdueJobService overdueJobService;

    public OverdueJobScheduler(OverdueJobService overdueJobService) {
        this.overdueJobService = overdueJobService;
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "America/Bogota")
    public void runDaily() {
        int processed = overdueJobService.run();
        LOGGER.info("Tarea diaria de vencimientos finalizada: {} préstamos actualizados.", processed);
    }
}
