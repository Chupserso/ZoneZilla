const axios = require("axios");

const cfRequest = async (method, endpoint, email, apiKey, body = null) => {
    try {
        const response = await axios({
            method,
            url: `https://api.cloudflare.com/client/v4/${endpoint}`,
            headers: {
                "X-Auth-Email": email,
                "X-Auth-Key": apiKey,
                "Content-Type": "application/json",
            },
            data: body,
        });
        return response.data;
    } catch (error) {
        return { success: false, errors: error.response?.data?.errors || [error.message] };
    }
};

const handleCloudflare = async (data) => {
    const { email, apiKey, domains, ip, deleteOld, disableIPv6, purgeCache, httpsOnly } = data;

    const domainList = domains.split(/\r?\n/).map(d => d.trim()).filter(Boolean);

    const results = [];

    for (const domain of domainList) {
        const zoneResp = await cfRequest("POST", "zones", email, apiKey, {
            name: domain,
            jump_start: true,
        });

        if (!zoneResp.success) {
            results.push({ domain, status: "Ошибка при добавлении", error: zoneResp.errors });
            continue;
        }

        const zoneId = zoneResp.result.id;
        const nameServers = zoneResp.result.name_servers;

        if (deleteOld) {
            const aRecords = await cfRequest("GET", `zones/${zoneId}/dns_records?type=A`, email, apiKey);
            for (const rec of aRecords.result || []) {
                await cfRequest("DELETE", `zones/${zoneId}/dns_records/${rec.id}`, email, apiKey);
            }
        }

        if (disableIPv6) {
            const aaaaRecords = await cfRequest("GET", `zones/${zoneId}/dns_records?type=AAAA`, email, apiKey);
            for (const rec of aaaaRecords.result || []) {
                await cfRequest("DELETE", `zones/${zoneId}/dns_records/${rec.id}`, email, apiKey);
            }
        }

        await cfRequest("POST", `zones/${zoneId}/dns_records`, email, apiKey, {
            type: "A",
            name: domain,
            content: ip,
            ttl: 1,
            proxied: true,
        });

        if (httpsOnly) {
            await cfRequest("PATCH", `zones/${zoneId}/settings/always_use_https`, email, apiKey, {
                value: "on",
            });
        }

        if (purgeCache) {
            await cfRequest("POST", `zones/${zoneId}/purge_cache`, email, apiKey, {
                purge_everything: true,
            });
        }

        results.push({
            domain,
            status: "Зона добавлена",
            name_servers: nameServers,
        });
    }

    return results;
};

module.exports = { handleCloudflare };