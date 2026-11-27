#pragma once

/* Modem task. Send the queued copy at QoS 1 and complete the publish slot. */
void modem_mqtt_publish_pending(void);
