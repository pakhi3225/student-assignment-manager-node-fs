(function () {
  'use strict';
  const app = angular.module('assignmentApp', []);
  app.controller('AssignmentController', ['$scope', '$http', function ($scope, $http) {
    // Set window.API_BASE_URL before app.js for a separately hosted frontend.
    const api = (window.API_BASE_URL || '').replace(/\/$/, '') + '/api/assignments';
    $scope.assignments = []; $scope.filteredAssignments = []; $scope.searchText = ''; $scope.statusFilter = 'All';
    $scope.editingId = null; $scope.saving = false; $scope.errorMessage = ''; $scope.successMessage = '';
    $scope.blankForm = function () { const due = new Date(); due.setDate(due.getDate() + 7); return { title: '', subject: '', description: '', submissionDate: due, priority: 'Medium', status: 'Pending' }; };
    $scope.form = $scope.blankForm();
    $scope.loadAssignments = function () {
      $scope.errorMessage = '';
      $http.get(api).then(function (response) { $scope.assignments = response.data.assignments || []; $scope.refreshView(); }, function () { $scope.errorMessage = 'Could not reach the API. Start the backend and check its address.'; });
    };
    $scope.refreshView = function () {
      const term = ($scope.searchText || '').trim().toLocaleLowerCase(), result = [];
      // Loop, if/else, and switch demonstrate core JavaScript control flow.
      for (let i = 0; i < $scope.assignments.length; i += 1) {
        const item = $scope.assignments[i];
        const matchesText = !term || item.title.toLocaleLowerCase().includes(term) || item.subject.toLocaleLowerCase().includes(term);
        let matchesStatus;
        switch ($scope.statusFilter) { case 'Pending': matchesStatus = item.status === 'Pending'; break; case 'Completed': matchesStatus = item.status === 'Completed'; break; default: matchesStatus = true; }
        if (matchesText && matchesStatus) result.push(item);
      }
      $scope.filteredAssignments = result;
      $scope.completedCount = $scope.assignments.filter(item => item.status === 'Completed').length;
      $scope.pendingCount = $scope.assignments.length - $scope.completedCount;
      const today = new Date(); today.setHours(0, 0, 0, 0); const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
      $scope.upcomingCount = $scope.assignments.filter(item => { const due = new Date(item.submissionDate + 'T00:00:00'); return item.status === 'Pending' && due >= today && due <= nextWeek; }).length;
    };
    $scope.toPayload = function () { const due = $scope.form.submissionDate; const localDate = due instanceof Date ? [due.getFullYear(), String(due.getMonth() + 1).padStart(2, '0'), String(due.getDate()).padStart(2, '0')].join('-') : due; return { title: $scope.form.title, subject: $scope.form.subject, description: $scope.form.description || '', submissionDate: localDate, priority: $scope.form.priority, status: $scope.form.status }; };
    $scope.save = function () {
      if ($scope.assignmentForm.$invalid) return;
      $scope.saving = true; $scope.errorMessage = ''; $scope.successMessage = '';
      const wasEditing = Boolean($scope.editingId), request = wasEditing ? $http.put(api + '/' + encodeURIComponent($scope.editingId), $scope.toPayload()) : $http.post(api, $scope.toPayload());
      request.then(function () { $scope.successMessage = wasEditing ? 'Assignment updated.' : 'Assignment added.'; $scope.cancelEdit(); $scope.loadAssignments(); }, function (response) { $scope.errorMessage = response.data && response.data.details ? response.data.details.join(' ') : 'Could not save the assignment.'; }).finally(function () { $scope.saving = false; });
    };
    $scope.startNew = function () { $scope.cancelEdit(); document.getElementById('assignment-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $scope.edit = function (item) { $scope.editingId = item.id; $scope.form = { title: item.title, subject: item.subject, description: item.description || '', submissionDate: new Date(item.submissionDate + 'T00:00:00'), priority: item.priority, status: item.status }; document.getElementById('assignment-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    $scope.cancelEdit = function () { $scope.editingId = null; $scope.form = $scope.blankForm(); if ($scope.assignmentForm) $scope.assignmentForm.$setPristine(); };
    $scope.remove = function (item) { if (!window.confirm('Delete “' + item.title + '”? This cannot be undone.')) return; $scope.errorMessage = ''; $scope.successMessage = ''; $http.delete(api + '/' + encodeURIComponent(item.id)).then(function () { $scope.successMessage = 'Assignment deleted.'; $scope.loadAssignments(); }, function () { $scope.errorMessage = 'Could not delete the assignment.'; }); };
    $scope.toggleStatus = function (item) { const status = item.status === 'Pending' ? 'Completed' : 'Pending'; $http.patch(api + '/' + encodeURIComponent(item.id) + '/status', { status }).then(function () { $scope.loadAssignments(); }, function () { $scope.errorMessage = 'Could not update the assignment status.'; }); };
    $scope.formatDate = function (value) { return new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
    $scope.isOverdue = function (item) { return item.status === 'Pending' && new Date(item.submissionDate + 'T00:00:00') < new Date(new Date().setHours(0, 0, 0, 0)); };
    $scope.loadAssignments();
  }]);
}());
