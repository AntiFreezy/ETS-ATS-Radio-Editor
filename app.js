/**
 * ETS 2 / ATS Radio Editor - Main Application Logic
 * Version: 3.2 (Modal URL Edit, Pagination, In-Place Edit, No Checkboxes - Final)
 */
document.addEventListener('DOMContentLoaded', () => {

	// --- Глобальные переменные и константы ---
	const ITEMS_PER_PAGE_EDITOR = 50;

	// Элементы DOM
	const loadButton = document.getElementById('load-button');
	const loadFileInput = document.getElementById('load-file-input');
	const addStationButton = document.getElementById('add-station-button');
	const downloadButton = document.getElementById('download-button');
	const tableContainer = document.getElementById('table-container');
	const volumeControl = document.getElementById('volume-control');
	const stopPlaybackBtn = document.getElementById('stop-all-playback');
	const audioPlayer = document.getElementById('audio-player');
	const loadingOverlay = document.getElementById('loading-overlay');
	const loadingTextElement = document.getElementById('loading-text');
	const translateDiv = document.getElementById('translate');
	const tableControlsDiv = document.getElementById('table-controls');
	const paginationContainer = document.getElementById('pagination-container');
	const toastContainer = document.querySelector('.toast-container');
	const addStationModalElement = document.getElementById('addStationModal');
	const addStationForm = document.getElementById('add-station-form');
	const addStationModal = addStationModalElement ? new bootstrap.Modal(addStationModalElement) : null;
	const editUrlModalElement = document.getElementById('editUrlModal');
	const editUrlForm = document.getElementById('edit-url-form');
	const editUrlStationName = document.getElementById('edit-url-station-name');
	const editUrlInput = document.getElementById('edit-station-url');
	const editUrlStationIdInput = document.getElementById('edit-station-id');
	const editUrlModal = editUrlModalElement ? new bootstrap.Modal(editUrlModalElement) : null;

	// Состояние приложения
	let loadedList = [];
	let displayedList = []; // Filtered AND Sorted list
	let currentLanguage = 'en';
	let isPlaying = false;
	let currentPlayingStationId = null; // Station ID
	let currentPage = 1;
	let sortColumn = null; // Initial sort order is from file
	let sortDirection = 'asc';
	let isFileLoaded = false;
	let currentEditingCell = null; // TD element being edited

	// Строки для локализации
	const translations = {
		ru: {
			loading: "Загрузка...",
			processing: "Обработка файла...",
			info: "Загрузите ваш файл <code>live_streams.sii</code>, отредактируйте список и скачайте обновленный файл.",
			editHint: '<i class="bi bi-info-circle me-1"></i>Для редактирования поля (Название, Жанр и т.д.) дважды кликните по нему. URL редактируется по кнопке <i class="bi bi-link-45deg"></i>.',
			load: "Загрузить .sii",
			addRadio: "Добавить станцию",
			download: "Скачать .sii",
			select: "Загрузите файл .sii...",
			stopPlayback: "Остановить воспроизведение",
			volumeLabel: "Громкость:",
			name: "Название*",
			genre: "Жанр",
			language: "Язык",
			bitrate: "Битрейт",
			play: "Воспр.",
			remove: "Удалить",
			add: "Добавить",
			cancel: "Отмена",
			errAdd: "Ошибка! Поля URL и Название обязательны.",
			url: "URL (Ссылка)*",
			fileLoadSuccess: "Файл успешно загружен. Станций: {count}.",
			fileLoadError: "Ошибка чтения файла.",
			parsingError: "Ошибка парсинга файла. Убедитесь, что формат корректен.",
			deleteSuccess: 'Станция "{stationName}" удалена.',
			yes: "Да",
			no: "Нет",
			toastInfoTitle: "Информация",
			toastWarningTitle: "Внимание",
			toastErrorTitle: "Ошибка",
			tableHeaderPlay: "Воспр.",
			tableHeaderName: "Название",
			tableHeaderGenre: "Жанр",
			tableHeaderLanguage: "Язык",
			tableHeaderBitrate: "Битрейт",
			tableHeaderActions: "Действия",
			previousPage: "Пред.",
			nextPage: "След.",
			editUrlTitle: "Редактировать URL",
			saveChanges: "Сохранить",
			errorUrlEmpty: "URL не может быть пустым!",
			stationLabel: "Станция:",
			changesSaved: "Изменения сохранены",
			linkOldVersion: "Старая версия",
            linkRadioHelper: "Помощник Радио",
		},
		en: {
			loading: "Loading...",
			processing: "Processing file...",
			info: "Upload your <code>live_streams.sii</code> file, edit the list and download the updated file.",
			editHint: '<i class="bi bi-info-circle me-1"></i>Double-click a field (Name, Genre, etc.) to edit it. Edit the URL using the <i class="bi bi-link-45deg"></i> button.',
			load: "Upload .sii",
			addRadio: "Add Station",
			download: "Download .sii",
			select: "Upload an .sii file...",
			stopPlayback: "Stop playback",
			volumeLabel: "Volume:",
			name: "Name*",
			genre: "Genre",
			language: "Language",
			bitrate: "Bitrate",
			play: "Play",
			remove: "Remove",
			add: "Add",
			cancel: "Cancel",
			errAdd: "Error! URL and Name fields are required.",
			url: "URL*",
			fileLoadSuccess: "File loaded successfully. Stations: {count}.",
			fileLoadError: "Error reading file.",
			parsingError: "Error parsing file. Ensure the format is correct.",
			deleteSuccess: 'Station "{stationName}" deleted.',
			yes: "Yes",
			no: "No",
			toastInfoTitle: "Information",
			toastWarningTitle: "Warning",
			toastErrorTitle: "Error",
			tableHeaderPlay: "Play",
			tableHeaderName: "Name",
			tableHeaderGenre: "Genre",
			tableHeaderLanguage: "Language",
			tableHeaderBitrate: "Bitrate",
			tableHeaderActions: "Actions",
			previousPage: "Previous",
			nextPage: "Next",
			editUrlTitle: "Edit URL",
			saveChanges: "Save Changes",
			errorUrlEmpty: "URL cannot be empty!",
			stationLabel: "Station:",
			changesSaved: "Changes saved",
			linkOldVersion: "Old Version",
            linkRadioHelper: "Radio Helper",
		}
	};

	// --- Основные Функции ---

	function showLoading(text = translations[currentLanguage].loading) {
		loadingTextElement.textContent = text;
		loadingOverlay.classList.remove('d-none');
		loadingOverlay.classList.add('d-flex');
	}

	function hideLoading() {
		loadingOverlay.classList.add('d-none');
		loadingOverlay.classList.remove('d-flex');
	}

	function showToast(message, type = 'info', delay = 5000) {
		if (!toastContainer) return;
		const T = translations[currentLanguage];
		let title = T.toastInfoTitle;
		let icon = '<i class="bi bi-info-circle-fill me-2"></i>';
		let bg = 'bg-info text-dark';
		let btnCls = '';
		switch (type) {
			case 'warning':
				title = T.toastWarningTitle;
				icon = '<i class="bi bi-exclamation-triangle-fill me-2"></i>';
				bg = 'bg-warning text-dark';
				break;
			case 'error':
				title = T.toastErrorTitle;
				icon = '<i class="bi bi-x-octagon-fill me-2"></i>';
				bg = 'bg-danger text-white';
				btnCls = 'btn-close-white';
				break;
			case 'success':
				title = T.changesSaved;
				icon = '<i class="bi bi-check-circle-fill me-2"></i>';
				bg = 'bg-success text-white';
				btnCls = 'btn-close-white';
				break;
		}
		const id = 'toast-' + Date.now();
		const html = `<div id="${id}" class="toast ${bg}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="${delay}"><div class="toast-header ${bg.includes('text-white') ? 'text-white' : 'text-dark'} border-0">${icon}<strong class="me-auto">${title}</strong><button type="button" class="btn-close ${btnCls}" data-bs-dismiss="toast" aria-label="Close"></button></div><div class="toast-body">${message}</div></div>`;
		toastContainer.insertAdjacentHTML('beforeend', html);
		const el = document.getElementById(id);
		const toast = new bootstrap.Toast(el, {
			autohide: delay > 0,
			delay: delay
		});
		el.addEventListener('hidden.bs.toast', () => el.remove());
		toast.show();
	}

	function translateUI() {
		const T = translations[currentLanguage];
		document.documentElement.lang = currentLanguage;
		document.querySelectorAll('[data-translate]').forEach(el => {
			const k = el.dataset.translate;
			if (T[k] !== undefined) el.textContent = T[k];
		});
		document.querySelectorAll('[data-translate-html]').forEach(el => {
			const k = el.dataset.translateHtml;
			if (T[k] !== undefined) el.innerHTML = T[k];
		});
		document.querySelectorAll('[data-translate-title]').forEach(el => {
			const k = el.dataset.translateTitle;
			if (T[k] !== undefined) el.title = T[k];
		});
		const ph = tableContainer.querySelector('div.alert, div.text-center');
		if (ph) {
			if (ph.classList.contains('alert-warning')) ph.textContent = T.noStationsFound;
			else if (ph.classList.contains('text-center')) ph.textContent = T.select;
		}
		const th = document.querySelector('#station-table thead tr');
		if (th) {
			const h = th.querySelectorAll('th');
			h[0].textContent = T.tableHeaderPlay;
			h[1].textContent = T.tableHeaderName;
			h[2].textContent = T.tableHeaderGenre;
			h[3].textContent = T.tableHeaderLanguage;
			h[4].textContent = T.tableHeaderBitrate;
			h[5].textContent = T.tableHeaderActions;
		}
		if (paginationContainer.querySelector('ul')) {
			const totalP = Math.ceil(displayedList.length / ITEMS_PER_PAGE_EDITOR) || 1;
			renderPaginationControls(currentPage, totalP);
		}
		translateDiv.querySelectorAll('img').forEach(img => img.classList.toggle('active', img.dataset.lang === currentLanguage));
		updateEditorUIState();
	}

	function setLanguage(lang) {
		currentLanguage = translations[lang] ? lang : 'en';
		translateUI();
		try {
			localStorage.setItem('ets2RadioEditorLang', currentLanguage);
		} catch (e) {}
		if (isFileLoaded) applySortingAndPagination();
	}

	// --- Логика Редактора ---

	function parseSiiContent(content) {
		const lines = content.match(/stream_data\[\d+\]:\s*\"(.+)\"/g);
		if (!lines) {
			showToast(translations[currentLanguage].parsingError, 'error');
			return null;
		}
		return lines.map((l, i) => {
			const m = l.match(/\"(.+)\"/);
			const d = m ? m[1] : '';
			const p = d.split('|');
			return {
				id: i,
				url: p[0] || '',
				name: (p[1] || 'Unnamed').replace(/'/g, '"'),
				genre: p[2] || 'N/A',
				language: p[3] || 'N/A',
				bitrate: p[4] || 'N/A'
			};
		});
	}

	function handleFileLoad(e) {
		const file = e.target.files[0];
		if (!file) return;
		showLoading(translations[currentLanguage].processing);
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const content = ev.target.result;
				const parsed = parseSiiContent(content);
				if (parsed) {
					loadedList = parsed;
					currentPage = 1;
					sortColumn = null;
					isFileLoaded = true;
					applySortingAndPagination();
					tableControlsDiv.classList.remove('d-none');
					addStationButton.disabled = false;
					downloadButton.disabled = false;
					showToast(translations[currentLanguage].fileLoadSuccess.replace('{count}', loadedList.length), 'success');
				} else {
					resetEditorState();
				}
			} catch (err) {
				console.error("Processing err:", err);
				showToast(translations[currentLanguage].parsingError, 'error');
				resetEditorState();
			} finally {
				hideLoading();
				loadFileInput.value = '';
			}
		};
		reader.onerror = () => {
			console.error("FileReader error");
			showToast(translations[currentLanguage].fileLoadError, 'error');
			hideLoading();
			resetEditorState();
			loadFileInput.value = '';
		};
		reader.readAsText(file);
	}

	function resetEditorState() {
		loadedList = [];
		displayedList = [];
		isFileLoaded = false;
		tableContainer.innerHTML = `<div class="text-center p-5 text-light" data-translate="select">${translations[currentLanguage].select}</div>`;
		tableControlsDiv.classList.add('d-none');
		addStationButton.disabled = true;
		downloadButton.disabled = true;
		paginationContainer.innerHTML = '';
		updateEditorUIState();
	}

	function handleAddStation(e) {
		e.preventDefault();
		const T = translations[currentLanguage];
		const url = document.getElementById('station-url').value.trim();
		const name = document.getElementById('station-name').value.trim();
		const genre = document.getElementById('station-genre').value.trim() || 'N/A';
		const lang = document.getElementById('station-language').value.trim().toUpperCase() || 'N/A';
		const bitrate = document.getElementById('station-bitrate').value.trim() || 'N/A';
		if (!url || !name) {
			showToast(T.errAdd, 'error');
			return;
		}
		const newId = loadedList.reduce((maxId, s) => Math.max(s.id, maxId), -1) + 1;
		const newStation = {
			id: newId,
			url,
			name,
			genre,
			language: lang,
			bitrate
		};
		loadedList.push(newStation);
		addStationModal.hide();
		addStationForm.reset();
		applySortingAndPagination();
		showToast(`"${name}" ${T.addSuccess || 'added'}`, 'success');
		tableContainer.scrollTop = tableContainer.scrollHeight;
	}

	function handleDeleteStation(id) {
		const idx = loadedList.findIndex(s => s.id == id);
		if (idx > -1) {
			const name = loadedList[idx].name;
			loadedList.splice(idx, 1);
			applySortingAndPagination();
			showToast(translations[currentLanguage].deleteSuccess.replace('{stationName}', name), 'info');
		}
	}

	function openEditUrlModal(stationId, currentUrl, stationName) {
		if (currentEditingCell) cancelEdit();
		if (!editUrlModal) return;
		editUrlStationName.textContent = stationName;
		editUrlInput.value = currentUrl;
		editUrlStationIdInput.value = stationId;
		editUrlModal.show();
	}

	function handleEditUrlSubmit(e) {
		e.preventDefault();
		const T = translations[currentLanguage];
		const newUrl = editUrlInput.value.trim();
		const id = editUrlStationIdInput.value;
		if (!newUrl) {
			showToast(T.errorUrlEmpty, 'error');
			return;
		}
		const idx = loadedList.findIndex(s => s.id == id);
		if (idx > -1) {
			if (newUrl !== loadedList[idx].url) {
				loadedList[idx].url = newUrl;
				const playBtn = tableContainer.querySelector(`.btn-play[data-station-id="${id}"]`);
				if (playBtn) playBtn.dataset.url = newUrl;
				showToast(T.changesSaved, 'success', 2000);
			}
			editUrlModal.hide();
		} else {
			console.error(`ID ${id} not found.`);
			showToast(T.stationDataNotFound || "Station not found", 'error');
			editUrlModal.hide();
		}
	}

	// --- Рендеринг и UI ---

	function applySortingAndPagination() {
		displayedList = (sortColumn) ? sortStations(loadedList, sortColumn, sortDirection) : [...loadedList];
		const totalItems = displayedList.length;
		const totalP = Math.ceil(totalItems / ITEMS_PER_PAGE_EDITOR) || 1;
		if (currentPage > totalP) currentPage = totalP;
		if (currentPage < 1) currentPage = 1;
		const start = (currentPage - 1) * ITEMS_PER_PAGE_EDITOR;
		const pageItems = displayedList.slice(start, start + ITEMS_PER_PAGE_EDITOR);
		renderTable(pageItems);
		renderPaginationControls(currentPage, totalP);
		updateEditorUIState();
	}

	function sortStations(stations, column, direction) {
		if (!stations?.length || !column) return stations;
		const mod = direction === 'asc' ? 1 : -1;
		if (stations[0] && stations[0][column] === undefined) return stations;
		return [...stations].sort((a, b) => {
			let vA = a[column] ?? null;
			let vB = b[column] ?? null;
			if (vA === null && vB !== null) return 1 * mod;
			if (vA !== null && vB === null) return -1 * mod;
			if (vA === null && vB === null) return 0;
			if (typeof vA === 'string') return (vA || "").localeCompare(vB || "", currentLanguage) * mod;
			if (typeof vA === 'number') return (vA - vB) * mod;
			return 0;
		});
	}

	function renderTable(stationsToRender) {
		const T = translations[currentLanguage];
		tableContainer.innerHTML = '';
		if (!stationsToRender?.length) {
			let msg = T.select;
			if (isFileLoaded) msg = T.noStationsFound;
			tableContainer.innerHTML = `<div class="alert alert-warning text-center p-5">${msg}</div>`;
			paginationContainer.innerHTML = '';
			updateEditorUIState();
			return;
		}
		const tableResponsive = document.createElement('div');
		tableResponsive.className = 'table-responsive';
		const table = document.createElement('table');
		table.id = 'station-table';
		table.className = 'table table-sm table-hover table-borderless';
		const thead = table.createTHead();
		thead.className = 'sticky-top';
		const hr = thead.insertRow();
		const hConf = [{
			k: 'tableHeaderPlay',
			w: '8%'
		}, {
			k: 'tableHeaderName',
			w: '32%',
			edit: 'name'
		}, {
			k: 'tableHeaderGenre',
			w: '18%',
			edit: 'genre'
		}, {
			k: 'tableHeaderLanguage',
			w: '10%',
			edit: 'language'
		}, {
			k: 'tableHeaderBitrate',
			w: '10%',
			edit: 'bitrate'
		}, {
			k: 'tableHeaderActions',
			w: '12%'
		}];
		hConf.forEach(c => {
			const th = document.createElement('th');
			th.textContent = T[c.k] || '';
			th.style.width = c.w;
			hr.appendChild(th);
		});
		const tbody = table.createTBody();
		stationsToRender.forEach(s => {
			const r = tbody.insertRow();
			r.dataset.stationId = s.id;
			const play = isPlaying && currentPlayingStationId === s.id;
			const cPlay = r.insertCell();
			cPlay.className = 'text-center align-middle';
			const btnPlay = document.createElement('button');
			btnPlay.className = `btn ${play ? 'btn-warning' : 'btn-info'} btn-sm btn-play p-1`;
			btnPlay.dataset.url = s.url;
			btnPlay.dataset.stationId = s.id;
			btnPlay.title = `${T.play} ${s.name}`;
			const iPlay = document.createElement('span');
			iPlay.className = `bi ${play ? 'bi-stop-fill' : 'bi-play-fill'}`;
			btnPlay.appendChild(iPlay);
			cPlay.appendChild(btnPlay);
			addEditableCell(r, s.name, 'name', s.id);
			addEditableCell(r, s.genre, 'genre', s.id);
			addEditableCell(r, s.language, 'language', s.id);
			addEditableCell(r, s.bitrate, 'bitrate', s.id);
			const cAct = r.insertCell();
			cAct.className = 'text-center align-middle gap-1 justify-content-center';
			const btnEditUrl = document.createElement('button');
			btnEditUrl.className = 'btn btn-sm btn-outline-secondary p-1';
			btnEditUrl.title = T.editUrl;
			btnEditUrl.innerHTML = '<i class="bi bi-link-45deg"></i>';
			btnEditUrl.addEventListener('click', () => openEditUrlModal(s.id, s.url, s.name));
			cAct.appendChild(btnEditUrl);
			const btnDel = document.createElement('button');
			btnDel.className = 'btn btn-sm btn-delete p-1';
			btnDel.title = T.remove;
			btnDel.dataset.id = s.id;
			btnDel.innerHTML = '<i class="bi bi-trash-fill"></i>';
			cAct.appendChild(btnDel);
		});
		tableResponsive.appendChild(table);
		tableContainer.appendChild(tableResponsive);
		attachTableEventHandlers();
	}

	function addEditableCell(row, text, field, stationId) {
		const cell = row.insertCell();
		cell.textContent = text;
		cell.title = text;
		cell.dataset.field = field;
		cell.dataset.editable = "true";
		cell.dataset.stationId = stationId;
		return cell;
	}

	function attachTableEventHandlers() {
		tableContainer.querySelectorAll('.btn-play').forEach(btn => btn.addEventListener('click', handlePlayButtonClick));
		tableContainer.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => {
			handleDeleteStation(e.currentTarget.dataset.id);
		}));
		tableContainer.querySelectorAll('td[data-editable="true"]').forEach(cell => {
			cell.addEventListener('dblclick', () => makeCellEditable(cell));
		});
	}

	function makeCellEditable(cell) {
		if (currentEditingCell || cell.querySelector('.editing-input')) return;
		cancelEdit();
		currentEditingCell = cell;
		const originalValue = cell.textContent;
		const field = cell.dataset.field;
		cell.innerHTML = '';
		const input = document.createElement('input');
		input.type = (field === 'url') ? 'url' : 'text';
		input.className = 'editing-input';
		input.value = originalValue;
		input.dataset.originalValue = originalValue;
		input.addEventListener('blur', () => saveEdit(input, cell, field, cell.dataset.stationId));
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') saveEdit(input, cell, field, cell.dataset.stationId);
			else if (e.key === 'Escape') cancelEdit();
		});
		cell.appendChild(input);
		input.focus();
		input.select();
	}

	function saveEdit(input, cell, field, stationId) {
		const newValue = input.value.trim();
		const originalValue = input.dataset.originalValue;
		currentEditingCell = null;
		const idx = loadedList.findIndex(s => s.id == stationId);
		if (idx > -1) {
			if (newValue !== originalValue) {
				if ((field === 'url' || field === 'name') && !newValue) {
					showToast(translations[currentLanguage].errAdd, 'error');
					cell.textContent = originalValue;
					cell.title = originalValue;
					return;
				}
				loadedList[idx][field] = newValue || (field === 'url' || field === 'name' ? originalValue : 'N/A');
				showToast(translations[currentLanguage].changesSaved, 'success', 2000);
			}
			cell.textContent = loadedList[idx][field];
			cell.title = loadedList[idx][field];
		} else {
			console.error(`Station ID ${stationId} not found.`);
			cell.textContent = originalValue;
			cell.title = originalValue;
		}
	}

	function cancelEdit() {
		if (!currentEditingCell) return;
		const input = currentEditingCell.querySelector('.editing-input');
		if (input) {
			const originalValue = input.dataset.originalValue;
			currentEditingCell.textContent = originalValue;
			currentEditingCell.title = originalValue;
		}
		currentEditingCell = null;
	}

	function renderPaginationControls(pageNum, totalPagesNum) {
		paginationContainer.innerHTML = '';
		const T = translations[currentLanguage];
		if (totalPagesNum <= 1) return;
		const ul = document.createElement('ul');
		ul.className = 'pagination pagination-sm';
		const maxP = 7;
		const half = Math.floor(maxP / 2);
		ul.appendChild(createPageItem(pageNum - 1, pageNum, T.previousPage, pageNum === 1));
		let start = 1,
			end = totalPagesNum;
		if (totalPagesNum > maxP) {
			if (pageNum <= half + 1) end = maxP - 1;
			else if (pageNum >= totalPagesNum - half) start = totalPagesNum - (maxP - 2);
			else {
				start = pageNum - (half - 1);
				end = pageNum + (half - 1);
			}
		}
		if (start > 1) {
			ul.appendChild(createPageItem(1, pageNum));
			if (start > 2) ul.appendChild(createEllipsisItem());
		}
		for (let i = start; i <= end; i++) ul.appendChild(createPageItem(i, pageNum));
		if (end < totalPagesNum) {
			if (end < totalPagesNum - 1) ul.appendChild(createEllipsisItem());
			ul.appendChild(createPageItem(totalPagesNum, pageNum));
		}
		ul.appendChild(createPageItem(pageNum + 1, pageNum, T.nextPage, pageNum === totalPagesNum));
		paginationContainer.appendChild(ul);
		paginationContainer.querySelectorAll('.page-link[data-page]').forEach(l => l.addEventListener('click', handlePaginationClick));
	}

	function createPageItem(pageNum, currentNum, text = null, disabled = false) {
		const li = document.createElement('li');
		li.className = `page-item ${pageNum === currentNum ? 'active' : ''} ${disabled ? 'disabled' : ''}`;
		const link = document.createElement(disabled ? 'span' : 'a');
		link.className = 'page-link';
		link.textContent = text ?? pageNum;
		if (!disabled) {
			link.href = '#';
			link.dataset.page = pageNum;
			if (pageNum === currentNum) link.setAttribute('aria-current', 'page');
		}
		li.appendChild(link);
		return li;
	}

	function createEllipsisItem() {
		const li = document.createElement('li');
		li.className = 'page-item disabled';
		const span = document.createElement('span');
		span.className = 'page-link';
		span.innerHTML = '…';
		li.appendChild(span);
		return li;
	}

	function handlePaginationClick(e) {
		e.preventDefault();
		const link = e.currentTarget;
		if (link.parentElement.classList.contains('disabled') || link.parentElement.classList.contains('active')) return;
		const targetPage = parseInt(link.dataset.page, 10);
		if (!isNaN(targetPage) && targetPage !== currentPage) {
			currentPage = targetPage;
			applySortingAndPagination(); /* tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); */
		}
	}

	function handlePlayButtonClick(e) {
		const btn = e.currentTarget;
		const url = btn.dataset.url;
		const id = btn.dataset.stationId;
		if (btn.disabled) return;
		if (isPlaying && currentPlayingStationId === id) {
			stopAudioPlayback();
			return;
		}
		if (isPlaying) stopAudioPlayback();
		const iconSpan = btn.querySelector('span');
		if (iconSpan) {
			iconSpan.className = 'spinner-border spinner-border-sm';
			iconSpan.setAttribute('role', 'status');
		}
		btn.disabled = true;
		audioPlayer.src = url;
		audioPlayer.load();
		audioPlayer.play().then(() => {
			isPlaying = true;
			currentPlayingStationId = id;
			btn.classList.replace('btn-info', 'btn-warning');
			if (iconSpan) {
				iconSpan.className = 'bi bi-stop-fill';
				iconSpan.removeAttribute('role');
			}
			btn.disabled = false;
		}).catch(err => {
			console.error("Audio fail:", err);
			showToast(`${translations[currentLanguage].errorPlayingStation}: ${url}\n(${err.message})`, 'error', 7000);
			if (iconSpan) {
				iconSpan.className = 'bi bi-play-fill';
				iconSpan.removeAttribute('role');
			}
			btn.classList.replace('btn-warning', 'btn-info');
			btn.disabled = false;
			if (currentPlayingStationId === id) {
				isPlaying = false;
				currentPlayingStationId = null;
				audioPlayer.src = '';
			}
		});
	}

	function stopAudioPlayback() {
		const pId = currentPlayingStationId;
		audioPlayer.pause();
		audioPlayer.src = '';
		isPlaying = false;
		currentPlayingStationId = null;
		if (pId !== null) {
			const btn = document.querySelector(`#station-table .btn-play[data-station-id="${pId}"]`);
			if (btn) {
				btn.classList.replace('btn-warning', 'btn-info');
				const icon = btn.querySelector('span');
				if (icon) {
					icon.className = 'bi bi-play-fill';
					icon.removeAttribute('role');
				}
				btn.disabled = false;
			}
		}
	}

	function updateEditorUIState() {
		const total = loadedList.length;
		downloadButton.disabled = !isFileLoaded || total === 0;
		addStationButton.disabled = !isFileLoaded;
		tableControlsDiv.classList.toggle('d-none', !isFileLoaded || total === 0);
		paginationContainer.style.display = total > 0 ? '' : 'none';
	}

	function generateAndDownloadSii() {
		const T = translations[currentLanguage];
		if (!isFileLoaded || loadedList.length === 0) {
			showToast("Нет данных для скачивания.", 'warning');
			return;
		}
		const stationsToUse = loadedList;
		let out = "SiiNunit\n{\nlive_stream_def : .live_streams {\n";
		stationsToUse.forEach((s, i) => {
			const name = (s.name || 'Unknown').replace(/\|/g, 'I').replace(/"/g, '`').trim();
			const genre = (s.genre || 'Various').replace(/\|/g, '/').replace(/"/g, '`').trim();
			const lang = s.language || 'N/A';
			const bit = s.bitrate || 'N/A';
			if (s.url) out += ` stream_data[${i}]: "${s.url}|${name}|${genre}|${lang}|${bit}|0"\n`;
		});
		out += `\n stream_count: ${stationsToUse.length}\n}\n\n}`;
		try {
			downloadFile(out, "live_streams.sii", "text/plain;charset=utf-8");
		} catch (e) {
			console.error("DL Error:", e);
			showToast("File download failed.", 'error');
		}
	}

	function downloadFile(data, filename, type) {
		const file = new Blob([data], {
			type: type
		});
		const a = document.createElement("a");
		const url = URL.createObjectURL(file);
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(() => {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 0);
	}

	// --- Инициализация ---
	const savedLang = localStorage.getItem('ets2RadioEditorLang');
	const browserLang = navigator.language || navigator.userLanguage;
	setLanguage(savedLang || (browserLang?.startsWith('ru') ? 'ru' : 'en'));
	updateEditorUIState();

	// --- Слушатели событий ---
	loadButton.addEventListener('click', () => loadFileInput.click());
	loadFileInput.addEventListener('change', handleFileLoad);
	addStationButton.addEventListener('click', () => {
		if (addStationModal) addStationModal.show();
	});
	addStationForm.addEventListener('submit', handleAddStation);
	editUrlForm?.addEventListener('submit', handleEditUrlSubmit);
	stopPlaybackBtn.addEventListener('click', stopAudioPlayback);
	volumeControl.addEventListener('input', (e) => {
		audioPlayer.volume = e.target.value;
	});
	translateDiv.addEventListener('click', (e) => {
		if (e.target.tagName === 'IMG' && e.target.dataset.lang) setLanguage(e.target.dataset.lang);
	});
	downloadButton.addEventListener('click', generateAndDownloadSii);
	document.addEventListener('click', (e) => {
		if (currentEditingCell && !currentEditingCell.contains(e.target)) cancelEdit();
	});

	// --- Начальная настройка ---
	tableControlsDiv.classList.add('d-none');
	audioPlayer.volume = volumeControl.value;

}); // Конец DOMContentLoaded