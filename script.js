/** ===========================================================
 *  ENHANCED APPLICATION LOGIC V3 - Developer Guru Edition
 *  (Fixed and Optimized)
 *  =========================================================== */

class EnhancedDebtDashboard {
  constructor() {
    this.data = { debt: [], gdp: [], perCapita: [] }; // Initialize with empty arrays
    this.charts = {};
    this.currentPeriod = '5Y';
    this.fullData = { debt: [], gdp: [], perCapita: [], population: [], euComparison: [], economic: {} };
    this.realTimeInterval = null;
    
    this.config = {
      eurostatBase: 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/',
      updateInterval: 1000,
      colors: {
        primary: '#000091',
        secondary: '#E1000F',
        success: '#00A95F',
        warning: '#FF8500',
        info: '#0078D4',
        danger: '#DC3545'
      }
    };
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.showLoading();
    
    try {
      await this.loadAllData();
      this.prepareData();
      this.filterDataForPeriod(); // Initialize this.data BEFORE rendering
      this.renderDashboard();
      this.setupRealTimeCounter();
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      this.handleError(error);
    } finally {
      this.hideLoading();
    }
  }

  showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
  }

  async loadAllData() {
    try {
      const [debtData, gdpData, populationData, euComparisonData, economicData] = await Promise.all([
        this.fetchEurostatAPI('gov_10dd_edpt1', { unit: 'MIO_EUR', sector: 'S13', na_item: 'GD', geo: 'FR' }),
        this.fetchEurostatAPI('gov_10dd_edpt1', { unit: 'PC_GDP', sector: 'S13', na_item: 'GD', geo: 'FR' }),
        this.fetchEurostatAPI('demo_pjan', { sex: 'T', age: 'TOTAL', geo: 'FR', lastTimePeriod: '1' }),
        this.getFallbackData('eu_comparison'),
        this.getFallbackData('economic_indicators')
      ]);

      this.fullData = {
        debt: debtData || [],
        gdp: gdpData || [],
        population: populationData || [],
        euComparison: euComparisonData || [],
        economic: economicData || {}
      };
    } catch (error) {
      console.warn('Error loading data, using fallbacks:', error);
      this.loadFallbackData();
    }
  }

  loadFallbackData() {
    this.fullData = {
      debt: [
        {year: 2019, value: 2380000}, {year: 2020, value: 2650000}, 
        {year: 2021, value: 2813000}, {year: 2022, value: 2956800}, 
        {year: 2023, value: 3101200}, {year: 2024, value: 3250000}
      ],
      gdp: [
        {year: 2019, value: 98.1}, {year: 2020, value: 114.6}, 
        {year: 2021, value: 112.9}, {year: 2022, value: 111.9}, 
        {year: 2023, value: 110.6}, {year: 2024, value: 112.2}
      ],
      population: [{year: 2024, value: 68400000}],
      euComparison: [
        ['🇬🇷', 'Grèce', 172.6, 1], ['🇮🇹', 'Italie', 134.6, 2], 
        ['🇵🇹', 'Portugal', 120.2, 3], ['🇫🇷', 'France', 110.6, 4],
        ['🇪🇸', 'Espagne', 105.5, 5], ['🇧🇪', 'Belgique', 105.0, 6], 
        ['🇦🇹', 'Autriche', 82.4, 7], ['🇩🇪', 'Allemagne', 63.7, 15]
      ],
      economic: {
        gdpGrowth: [
          {year: 2020, value: -8.0}, {year: 2021, value: 6.8}, 
          {year: 2022, value: 2.5}, {year: 2023, value: 0.9}, {year: 2024, value: 1.1}
        ],
        inflation: [
          {year: 2020, value: 0.5}, {year: 2021, value: 2.1}, 
          {year: 2022, value: 5.9}, {year: 2023, value: 4.9}, {year: 2024, value: 2.8}
        ],
        unemployment: [
          {year: 2020, value: 8.0}, {year: 2021, value: 7.9}, 
          {year: 2022, value: 7.3}, {year: 2023, value: 7.4}, {year: 2024, value: 7.5}
        ],
        interestRates: [
          {year: 2020, value: 0.25}, {year: 2021, value: 0.15}, 
          {year: 2022, value: 2.1}, {year: 2023, value: 3.2}, {year: 2024, value: 2.9}
        ]
      }
    };
  }

  async fetchEurostatAPI(dataset, params) {
    const url = new URL(dataset, this.config.eurostatBase);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return this.parseEurostatResponse(json);
    } catch (error) {
      console.warn(`API fetch for ${dataset} failed, using fallback data.`, error);
      return this.getFallbackData(dataset);
    }
  }

  parseEurostatResponse(json) {
    if (!json || !json.dimension || !json.value) return [];
    const timeKey = Object.keys(json.dimension).find(k => k.toLowerCase() === 'time') || 'time';
    const timeIndex = json.dimension[timeKey].category.index;
    const years = Object.keys(timeIndex).sort();
    
    return years.map(year => ({
      year: parseInt(year),
      value: json.value[timeIndex[year]]
    })).filter(d => d.value !== null);
  }

  getFallbackData(dataset) {
    const fallbacks = {
      'gov_10dd_edpt1': this.fullData.debt.length > 0 ? this.fullData.debt : [
        {year: 2022, value: 2956800}, {year: 2023, value: 3101200}, {year: 2024, value: 3250000}
      ],
      'demo_pjan': [{year: 2024, value: 68400000}],
      'eu_comparison': [
        ['🇬🇷', 'Grèce', 172.6, 1], ['🇮🇹', 'Italie', 134.6, 2], ['🇫🇷', 'France', 110.6, 4],
        ['🇪🇸', 'Espagne', 105.5, 5], ['🇧🇪', 'Belgique', 105.0, 6], ['🇩🇪', 'Allemagne', 63.7, 15]
      ],
      'economic_indicators': {
        gdpGrowth: [{year: 2020, value: -8.0}, {year: 2021, value: 6.8}, {year: 2022, value: 2.5}, {year: 2023, value: 0.9}],
        inflation: [{year: 2020, value: 0.5}, {year: 2021, value: 2.1}, {year: 2022, value: 5.9}, {year: 2023, value: 4.9}],
        unemployment: [{year: 2020, value: 8.0}, {year: 2021, value: 7.9}, {year: 2022, value: 7.3}, {year: 2023, value: 7.4}],
        interestRates: [{year: 2020, value: 0.25}, {year: 2021, value: 0.15}, {year: 2022, value: 2.1}, {year: 2023, value: 3.2}]
      }
    };
    return fallbacks[dataset] || [];
  }
  
  prepareData() {
    const latestPop = this.fullData.population.at(-1)?.value || 68000000;
    this.fullData.perCapita = this.fullData.debt.map(d => ({
      year: d.year,
      value: (d.value * 1e6) / latestPop
    }));
  }

  filterDataForPeriod() {
    const currentYear = new Date().getFullYear();
    let startYear;
    switch (this.currentPeriod) {
      case '5Y': startYear = currentYear - 5; break;
      case '10Y': startYear = currentYear - 10; break;
      case '20Y': startYear = currentYear - 20; break;
      default: startYear = 0;
    }
    
    this.data.debt = this.fullData.debt.filter(d => d.year >= startYear);
    this.data.gdp = this.fullData.gdp.filter(d => d.year >= startYear);
    this.data.perCapita = this.fullData.perCapita.filter(d => d.year >= startYear);
  }

  renderDashboard() {
    this.updateHeroSection();
    this.updateKPIs();
    this.renderCharts();
    this.renderEUComparison();
    this.renderDataTable();
    this.setupScrollAnimations();
  }

  updateHeroSection() {
    if (this.fullData.debt.length === 0) return;
    const latestDebt = this.fullData.debt.at(-1);
    const latestGDP = this.fullData.gdp.at(-1);
    const latestPerCap = this.fullData.perCapita.at(-1);
    const euRanking = this.fullData.euComparison.find(c => c[0] === '🇫🇷')?.[3] || 'N/A';

    const debtMainEl = document.getElementById('debt-main');
    const heroPcgdpEl = document.getElementById('hero-pcgdp');
    const heroPercapEl = document.getElementById('hero-percap');
    const heroRankingEl = document.getElementById('hero-ranking');
    const asofEl = document.querySelector('[data-slot="asof"]');

    if (debtMainEl) {
      debtMainEl.textContent = this.formatCurrency(latestDebt.value * 1e6);
      debtMainEl.classList.remove('skeleton');
    }
    if (heroPcgdpEl) heroPcgdpEl.textContent = `${latestGDP.value.toFixed(1)}%`;
    if (heroPercapEl) heroPercapEl.textContent = this.formatCurrency(latestPerCap.value, 0);
    if (heroRankingEl) heroRankingEl.textContent = `#${euRanking}`;
    if (asofEl) asofEl.textContent = `Données officielles (${latestDebt.year})`;
  }

  updateKPIs() {
    if (this.fullData.debt.length < 2) return;
    const latestDebt = this.fullData.debt.at(-1);
    const prevDebt = this.fullData.debt.at(-2);
    const latestGDP = this.fullData.gdp.at(-1);
    const latestPerCap = this.fullData.perCapita.at(-1);
    const yoyChange = (latestDebt.value - prevDebt.value) * 1e6;
    const interestCharge = (latestDebt.value * 1e6) * 0.028; // Estimate
    const euRanking = this.fullData.euComparison.find(c => c[0] === '🇫🇷')?.[3] || 'N/A';

    this.updateKPI('kpi-pcgdp', `${latestGDP.value.toFixed(1)}%`, this.calculateTrend(this.fullData.gdp));
    this.updateKPI('kpi-percap', this.formatCurrency(latestPerCap.value, 0));
    this.updateKPI('kpi-yoy', `+${this.formatNumber(yoyChange / 1e9, 1)} Md€`);
    this.updateKPI('kpi-interest', this.formatNumber(interestCharge / 1e9, 1) + ' Md€');
    this.updateKPI('kpi-eu-rank', `#${euRanking}`);
    
    const popHintEl = document.getElementById('pop-hint');
    if (popHintEl) popHintEl.textContent = `Pop. ${this.formatNumber(this.fullData.population.at(-1).value)}`;
  }

  updateKPI(elementId, value, trend = null) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = value;
    element.classList.remove('skeleton');
    
    const trendElement = document.getElementById(elementId.replace('kpi-', '') + '-trend');
    if (trendElement && trend) {
      const iconClass = trend.direction === 'up' ? 'fa-arrow-up trend-up' : 'fa-arrow-down trend-down';
      trendElement.innerHTML = `<i class="fas ${iconClass}"></i> ${trend.value}`;
    }
  }

  calculateTrend(series) {
    if (series.length < 2) return { direction: 'neutral', value: '' };
    const latest = series.at(-1).value;
    const previous = series.at(-2).value;
    const change = latest - previous;
    return {
      direction: change > 0 ? 'up' : 'down',
      value: `${change > 0 ? '+' : ''}${change.toFixed(1)} pts`
    };
  }
  
  setupRealTimeCounter() {
    if (this.fullData.debt.length < 2) return;
    
    try {
      // Get the latest two debt values (in millions of euros)
      const latestDebt = this.fullData.debt.at(-1);
      const previousDebt = this.fullData.debt.at(-2);
      
      if (!latestDebt || !previousDebt || !latestDebt.value || !previousDebt.value) {
        console.warn('Invalid debt data for real-time counter');
        return;
      }

      // Convert to euros and calculate year-over-year change
      const currentDebtEuros = latestDebt.value * 1e6;
      const previousDebtEuros = previousDebt.value * 1e6;
      const annualIncrease = currentDebtEuros - previousDebtEuros;
      
      // Calculate per-second increase (365.25 days * 24 hours * 60 minutes * 60 seconds)
      const secondsPerYear = 365.25 * 24 * 60 * 60;
      const increasePerSecond = annualIncrease / secondsPerYear;
      
      // Store the connection time (when the counter starts)
      const connectionTime = new Date();
      
      // Clear any existing interval
      if (this.realTimeInterval) {
        clearInterval(this.realTimeInterval);
      }

      // Start the real-time counter
      this.realTimeInterval = setInterval(() => {
        try {
          // Calculate elapsed time since user connected to the dashboard
          const now = new Date();
          const elapsedSeconds = (now - connectionTime) / 1000;
          
          // Calculate debt increase since connection
          const increaseSinceConnection = elapsedSeconds * increasePerSecond;
          
          // Update DOM elements safely
          const debtMainEl = document.getElementById('debt-main');
          const realtimeEl = document.getElementById('kpi-realtime');
          const perSecondEl = document.getElementById('per-second');
          
          if (debtMainEl && !isNaN(currentDebtEuros)) {
            const estimatedCurrentDebt = currentDebtEuros + increaseSinceConnection;
            debtMainEl.textContent = this.formatCurrency(estimatedCurrentDebt);
          }
          
          // Show increase since connection (will start small and grow)
          if (realtimeEl && !isNaN(increaseSinceConnection)) {
            realtimeEl.textContent = `+${this.formatCurrency(increaseSinceConnection, 0)}`;
          }
          
          if (perSecondEl && !isNaN(increasePerSecond)) {
            perSecondEl.textContent = `+${this.formatCurrency(increasePerSecond, 0)}/sec`;
          }
          
        } catch (error) {
          console.error('Error in real-time counter update:', error);
        }
      }, this.config.updateInterval);
      
    } catch (error) {
      console.error('Error setting up real-time counter:', error);
      // Set static fallback values
      const realtimeEl = document.getElementById('kpi-realtime');
      const perSecondEl = document.getElementById('per-second');
      
      if (realtimeEl) realtimeEl.textContent = '+0 €';
      if (perSecondEl) perSecondEl.textContent = '+0 €/sec';
    }
  }

  renderCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded, skipping chart rendering');
      return;
    }
    
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    this.renderMainDebtChart();
    this.renderEUComparisonChart();
    this.renderCompositionChart();
    this.renderInterestRatesChart();
    this.renderEconomicCharts();
  }

  createChart(canvasId, type, data, options) {
      const ctx = document.getElementById(canvasId);
      if(!ctx) {
        console.warn(`Canvas element ${canvasId} not found`);
        return;
      }
      if(this.charts[canvasId]) this.charts[canvasId].destroy();
      this.charts[canvasId] = new Chart(ctx, { type, data, options });
  }

  renderMainDebtChart() {
    this.updateMainChart(); // Initial render call
  }
  
  updateMainChart() {
      const chart = this.charts['chart-debt-evolution'];
      const activeToggle = document.querySelector('.chart-controls .chart-toggle.active');
      const dataType = activeToggle ? activeToggle.dataset.type : 'amount';
      let data, label, tickCallback;

      // Ensure data exists and has length
      if (!this.data.debt || this.data.debt.length === 0) {
        console.warn('No debt data available for chart');
        return;
      }

      switch(dataType) {
          case 'gdp': 
              data = this.data.gdp || [];
              label = '% du PIB';
              tickCallback = value => `${value}%`;
              break;
          case 'percap':
              data = this.data.perCapita || [];
              label = 'Dette par habitant';
              tickCallback = value => this.formatCurrency(value, 0);
              break;
          default:
              data = this.data.debt || [];
              label = 'Dette (Md€)';
              tickCallback = value => `${this.formatNumber(value/1000, 0)} Md€`;
              break;
      }
      
      const chartData = {
          labels: data.map(d => d.year),
          datasets: [{
              label: label,
              data: data.map(d => d.value),
              borderColor: this.config.colors.primary,
              backgroundColor: this.hexToRgba(this.config.colors.primary, 0.1),
              fill: true,
              tension: 0.4,
              pointRadius: 3,
          }]
      };

      const chartOptions = {
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { ticks: { callback: tickCallback } } }
      };

      if(!chart) {
          this.createChart('chart-debt-evolution', 'line', chartData, chartOptions);
      } else {
          chart.data = chartData;
          chart.options.scales.y.ticks.callback = tickCallback;
          chart.update();
      }
  }

  renderEUComparisonChart() {
    const countries = this.fullData.euComparison || [];
    if (countries.length === 0) return;
    
    this.createChart('chart-eu-comparison', 'bar', {
        labels: countries.map(c => `${c[0]} ${c[1]}`),
        datasets: [{
            label: 'Dette/PIB (%)',
            data: countries.map(c => c[2]),
            backgroundColor: countries.map(c => c[0] === '🇫🇷' ? this.config.colors.secondary : this.config.colors.primary)
        }]
    }, { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } } 
    });
  }

  renderCompositionChart() {
    this.createChart('chart-composition', 'doughnut', {
        labels: ['OAT (>1 an)', 'BTF (<1 an)', 'BTAN (2-5 ans)', 'Autres'],
        datasets: [{
            data: [65, 15, 15, 5],
            backgroundColor: [
                this.config.colors.primary, 
                this.config.colors.secondary, 
                this.config.colors.info, 
                this.config.colors.warning
            ],
            borderColor: document.body.classList.contains('dark-theme') ? '#1e293b' : '#ffffff',
            borderWidth: 2
        }]
    }, { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { position: 'bottom' } } 
    });
  }

  renderInterestRatesChart() {
    const ratesData = this.fullData.economic?.interestRates || [];
    if (ratesData.length === 0) return;
    
    this.createChart('chart-interest-rates', 'line', {
        labels: ratesData.map(d => d.year),
        datasets: [{
            label: 'Taux OAT 10 ans (%)',
            data: ratesData.map(d => d.value),
            borderColor: this.config.colors.warning,
            fill: true,
        }]
    }, { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } } 
    });
  }

  renderEconomicCharts() {
    const gdpData = this.fullData.economic?.gdpGrowth || [];
    if (gdpData.length > 0) {
      this.createChart('chart-gdp', 'bar', {
          labels: gdpData.map(d => d.year),
          datasets: [{
              label: 'Croissance PIB (%)',
              data: gdpData.map(d => d.value),
              backgroundColor: gdpData.map(d => d.value >= 0 ? this.config.colors.success : this.config.colors.danger)
          }]
      }, { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } } 
      });
    }

    const inflationData = this.fullData.economic?.inflation || [];
    if (inflationData.length > 0) {
      this.createChart('chart-inflation', 'line', {
          labels: inflationData.map(d => d.year),
          datasets: [{
              label: 'Inflation (%)',
              data: inflationData.map(d => d.value),
              borderColor: this.config.colors.danger
          }]
      }, { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } } 
      });
    }

    const unemploymentData = this.fullData.economic?.unemployment || [];
    if (unemploymentData.length > 0) {
      this.createChart('chart-employment', 'line', {
          labels: unemploymentData.map(d => d.year),
          datasets: [{
              label: 'Taux de chômage (%)',
              data: unemploymentData.map(d => d.value),
              borderColor: this.config.colors.info
          }]
      }, { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } } 
      });
    }
    
    // Budget chart with sample data
    this.createChart('chart-budget', 'bar', {
        labels: ['2020', '2021', '2022', '2023', '2024'],
        datasets: [{
            label: 'Solde budgétaire (% PIB)',
            data: [-9.1, -6.4, -4.8, -5.1, -4.9],
            backgroundColor: this.config.colors.danger
        }]
    }, { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } } 
    });
  }

  renderEUComparison() {
    const container = document.getElementById('eu-comparison-grid');
    if (!container) return;
    
    const countries = this.fullData.euComparison || [];
    container.innerHTML = countries.map(([flag, name, ratio, rank], i) => `
      <div class="country-card fade-in-up" style="--stagger-index: ${i + 1};">
        <div class="country-flag">${flag}</div>
        <div class="country-name">${name}</div>
        <div class="country-debt">${ratio.toFixed(1)}%</div>
        <div class="country-rank">#${rank} UE-27</div>
      </div>
    `).join('');
  }

  renderDataTable() { 
    const tableBody = document.getElementById('data-table-body');
    if (!tableBody) return;
    
    const debtData = this.fullData.debt || [];
    const gdpData = this.fullData.gdp || [];
    const perCapData = this.fullData.perCapita || [];
    
    const tableRows = debtData.map(debt => {
      const gdpEntry = gdpData.find(g => g.year === debt.year);
      const perCapEntry = perCapData.find(p => p.year === debt.year);
      const prevDebt = debtData.find(d => d.year === debt.year - 1);
      const variation = prevDebt ? ((debt.value - prevDebt.value) / prevDebt.value * 100) : 0;
      
      return `
        <tr>
          <td>${debt.year}</td>
          <td class="number">${this.formatNumber(debt.value / 1000, 1)}</td>
          <td class="number">${gdpEntry ? gdpEntry.value.toFixed(1) : 'N/A'}</td>
          <td class="number">${perCapEntry ? this.formatNumber(perCapEntry.value, 0) : 'N/A'}</td>
          <td class="number">${variation > 0 ? '+' : ''}${variation.toFixed(1)}%</td>
          <td class="number">2.8%</td>
          <td class="number">${this.formatNumber(debt.value * 0.028 / 1000, 1)}</td>
        </tr>
      `;
    }).join('');
    
    tableBody.innerHTML = tableRows;
  }

  setupEventListeners() {
    // Scroll events
    window.addEventListener('scroll', () => {
      const navContainer = document.getElementById('nav-container');
      if (navContainer) {
        navContainer.classList.toggle('scrolled', window.scrollY > 50);
      }
    });

    // Mobile menu toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (mobileToggle && navLinks) {
      mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('is-open');
      });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
          document.body.classList.toggle('dark-theme');
          // Redraw charts with correct colors
          Object.values(this.charts).forEach(chart => chart.destroy());
          this.renderCharts();
      });
    }

    // Time period selector
    const timeSelector = document.querySelector('.time-selector');
    if (timeSelector) {
      timeSelector.addEventListener('click', (e) => {
          if (e.target.matches('.time-btn')) {
              this.currentPeriod = e.target.dataset.period;
              const activeBtn = document.querySelector('.time-btn.active');
              if (activeBtn) activeBtn.classList.remove('active');
              e.target.classList.add('active');
              this.filterDataForPeriod();
              this.updateMainChart();
          }
      });
    }

    // Chart controls
    const chartControls = document.querySelector('.chart-controls');
    if (chartControls) {
      chartControls.addEventListener('click', (e) => {
          if (e.target.matches('.chart-toggle')) {
              const activeToggle = document.querySelector('.chart-toggle.active');
              if (activeToggle) activeToggle.classList.remove('active');
              e.target.classList.add('active');
              this.updateMainChart();
          }
      });
    }

    // FAB scroll to top
    const fab = document.getElementById('fab');
    if (fab) {
      fab.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  setupScrollAnimations() { 
    // Basic implementation for scroll animations
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    const animatedElements = document.querySelectorAll('.fade-in-up');
    animatedElements.forEach(el => observer.observe(el));
  }

  handleError(error) { 
    console.error('Dashboard Error:', error);
    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = `
      <div style="background: #fee; border: 1px solid #fcc; padding: 1rem; margin: 1rem; border-radius: 0.5rem;">
        <h3>Erreur de chargement</h3>
        <p>Une erreur s'est produite lors du chargement des données. Utilisation des données de démonstration.</p>
      </div>
    `;
    const main = document.querySelector('main');
    if (main) main.prepend(errorContainer);
  }
  
  // Utility functions
  formatCurrency = (amount, decimals = 0) => {
    try {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR', 
        maximumFractionDigits: decimals 
      }).format(amount);
    } catch (e) {
      return `${amount.toFixed(decimals)} €`;
    }
  };

  formatNumber = (number, decimals = 0) => {
    try {
      return new Intl.NumberFormat('fr-FR', { 
        maximumFractionDigits: decimals 
      }).format(number);
    } catch (e) {
      return number.toFixed(decimals);
    }
  };

  hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new EnhancedDebtDashboard();
});