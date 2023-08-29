
export interface IBomData {
  scan_date: string
  scan_start_utc_time: number
  scan_elapsed_ms: number
  orgs: string[]
  repo_whitelist: string[]
  scanners: string[]

  repos: {
    [repo: string]: {
      [scannerName: string]: any
    }
  }
}

export interface IBomRowData {
  id: string // unique row identifier
  repo: string
  service_name?: string
  maintainer_email?: string
  ci_id?: string

  open_pr_count?: number
  last_master_commit_ci_time?: Date
  last_master_commit_ci_status?: string
  min_approvers?: number
  req_status_checks?: string
  allow_force?: string

  docker_base_image?: string
  technologies?: string

  unit_test_result?: string
  sonar_status?: string
  coverage_result?: string
  coverage_total_lines?: number

  veracode_app?: string
  veracode_status?: 'Compliant' | 'Missing' | 'Outdated' | 'Noncompliant'
  veracode_last_static_scan_date?: Date
  veracode_last_static_scan_result?: string
  veracode_last_compliance_check?: Date
  veracode_app_profile_url?: string

  veracode_sca_status?: 'Missing' | 'Outdated' | 'Vulnerable' | 'OK'
  veracode_sca_last_scan_date?: Date
  veracode_sca_vulnerablility_count?: number
  veracode_sca_profile_url?: string

  messages?: string[]
}

// Flatten all scanner output into row data for a grid
export function generateBomRowData(bom: IBomData): IBomRowData[] {
  const rows = [] as IBomRowData[]

  for (const [repo, data] of Object.entries(bom.repos)) {
    const manifest = data?.manifest?.manifest
    const github = data?.manifest?.github
    const dockerfile = data?.manifest?.dockerfile
    const jenkins = data?.jenkins || {}

    // Always skip .github
    if (repo === '.github') continue

    // Extract data that will be common regardless of presence of a manifest
    const baseRow = {
      id: repo,
      repo: repo,
      // TODO: messages: messagesToString(s)

      // Github
      open_pr_count: github?.open_pr_count,
      total_pr_count: github?.total_pr_count,
      last_master_commit_ci_time: new Date(github?.master_status?.commit_status_time || github?.master_status?.commit_time),
      last_master_commit_ci_status: github?.master_status?.commit_status_state,
      min_approvers: github?.has_main_branch_protection && github?.main_branch_min_approvals || 0,
      req_status_checks: github?.main_branch_req_status_checks && 'Required' || 'None',
      allow_force: github?.main_branch_allow_force
    } as IBomRowData

    // Docker
    if (dockerfile?.base_image) {
      const filteredBaseImage = dockerfile?.base_image?.replace('${BUILD_REGISTRY}', '')
      baseRow.docker_base_image = `${filteredBaseImage}:${dockerfile?.base_version}`,
      baseRow.technologies = dockerfile?.technologies
        .map((t: any) => `${t.name}@${t.version}`).join('\n')
    }

    if (!manifest?.project_name || !manifest?.manifests?.length) {
      // This is all we can render if no manifest file data was loaded
      rows.push(baseRow)
      continue
    }

    // Render one row for each service/project in the manifest
    for (const service of manifest?.manifests) {
      const serviceRow = {...baseRow}

      serviceRow.id = `${repo} - ${service.project_name}`
      serviceRow.service_name = `${manifest.project_name} - ${service.project_name}`
      serviceRow.maintainer_email = manifest.maintainer_email
      serviceRow.ci_id = service.configurations?.dtcom?.ci_id
      serviceRow.veracode_app = service.veracode_app

      serviceRow.docker_base_image ??= service.docker?.base_image

      serviceRow.technologies = service.technologies
        .map((t: any) => `${t.name}@${t.version}`).join('\n')

      // Jenkins data
      serviceRow.unit_test_result = jenkins.test_results_available ? `${jenkins.test_total_count} / ${jenkins.test_skip_count} / ${jenkins.test_fail_count}` : 'None'
      serviceRow.sonar_status = 'None'
      serviceRow.coverage_result = 'None'
      if (jenkins.sonar_available)
        serviceRow.sonar_status = 'Enabled'
      if (jenkins.sonar_skipped)
        serviceRow.sonar_status = 'Skipped'
      if (jenkins.coverage_percent) {
        serviceRow.coverage_result = (jenkins.coverage_percent * 1).toPrecision(4)
        serviceRow.coverage_total_lines = jenkins.coverage_lines_analyzed
      }

      // Veracode data (per service)
      const vc = data?.veracode?.components?.find((c: any) => c.component_name === service.project_name)
      serviceRow.veracode_status = 'Missing'
      if (vc) {
        serviceRow.veracode_app = vc.veracode_app_name_actual || vc.veracode_app_name
        serviceRow.veracode_status = vc.veracode_status
        serviceRow.veracode_app_profile_url = vc.veracode_app_profile_url
        serviceRow.veracode_last_static_scan_result = vc.last_static_scan_result
        if (vc.last_static_scan_date) serviceRow.veracode_last_static_scan_date = new Date(vc.last_static_scan_date)
        if (vc.veracode_app_name && vc.veracode_app_name !== vc.veracode_app_name_actual) serviceRow.veracode_app += ' (!)'
      }

      // Veracode software composition analysis data
      const sca = data?.veracode_sca?.components?.find((c: any) => c.component_name === service.project_name)
      serviceRow.veracode_sca_status = 'Missing'
      if (sca) {
        serviceRow.veracode_sca_status = sca.status
        serviceRow.veracode_sca_last_scan_date = new Date(sca.last_scan_date)
        serviceRow.veracode_sca_vulnerablility_count = sca.vulnerability_issue_count
        serviceRow.veracode_sca_profile_url = sca.profile_url
      }

      rows.push(serviceRow)
    }
  }

  return rows
}
