# K6 Load Testing Project with InfluxDB and Grafana

![k6](https://img.shields.io/badge/k6-7D64FF?style=for-the-badge&logo=k6&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)
![InfluxDB](https://img.shields.io/badge/InfluxDB-22ADF6?style=for-the-badge&logo=influxdb&logoColor=white)

This project provides a complete setup for load testing using k6, with metrics storage in InfluxDB and visualization in Grafana.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [k6](https://k6.io/docs/get-started/installation/)

## Project Structure

This project follows the TIG (k6, InfluxDB, Grafana) stack architecture with the following structure:

```
.
├── docker-compose.yml            # Docker Compose configuration
├── tests/                        # Test scripts directory
│   └── basic_test.js            # Example k6 test script
├── influxdb/                     # InfluxDB configuration
│   └── config/                   # InfluxDB configuration files
└── grafana/
    └── provisioning/
        ├── dashboards/           # Grafana dashboard definitions
        │   └── k6-dashboard.json # Main k6 dashboard
        └── datasources/          # Data source configurations
            └── influxdb-datasource.yml
```

## Component Details

### 1. k6 Test Scripts

Location: `./tests/*.js`

- Define test scenarios, virtual users (VUs), and test duration
- Include HTTP requests and response validations
- Configure thresholds for test success/failure criteria
- Example metrics collected:
  - `http_req_duration`: Request duration metrics
  - `http_reqs`: Request rate and counts
  - `vus`: Virtual users count
  - `checks`: Success/failure rates of validations

### 2. InfluxDB

- Time-series database for storing k6 metrics
- Default configuration:
  - Port: 8086
  - Database: k6
  - Username/Password: k6/k6
- Data retention policies can be configured in `influxdb/config/`

### 3. Grafana

- Web-based visualization platform
- Pre-configured dashboards in `grafana/provisioning/dashboards/`
- Data source configuration in `grafana/provisioning/datasources/`
- Default access:
  - URL: http://localhost:3000
  - Username: admin
  - Password: admin

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd k6
```

### 2. Start the monitoring stack

```bash
docker-compose up -d
```

This will start:
- InfluxDB on http://localhost:8086
- Grafana on http://localhost:3000

### 3. Run a load test

Run a basic test with InfluxDB output:

```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/basic_test.js
```

### 4. View Results in Grafana

1. Open http://localhost:3000 in your browser
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. Navigate to Dashboards → Browse
4. Select the "k6 Load Test Dashboard"

## Test Configuration

Edit `tests/basic_test.js` to modify:
- Target URLs
- Virtual users and test duration
- Request patterns
- Success criteria and thresholds

## Dashboard Features

The provided k6 dashboard includes:
- Response time metrics (p95, p99, max)
- Request rate and error rate
- Virtual users count
- Data transfer rates
- HTTP status code distribution

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [InfluxDB Documentation](https://docs.influxdata.com/influxdb/)
- [Grafana Documentation](https://grafana.com/docs/)
- [k6 + InfluxDB +Grafana Integration Guide](https://k6.io/docs/results-output/real-time/influxdb-+-grafana/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
