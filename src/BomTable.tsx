import React, { useEffect, useState } from 'react'
import { DataGrid, GridColDef, GridFooter, GridFooterContainer, GridRenderCellParams, GridToolbar, GridValueFormatterParams } from '@mui/x-data-grid'
import Grid from '@mui/material/Unstable_Grid2'
import { generateBomRowData } from './util/bom-data'
import { css } from '@emotion/react'

function multilineTextRender(cellValues: GridRenderCellParams<string>) {
  return <div>
    { cellValues.value?.split('\n').map(v => (<div key={v}>{v}</div>)) }
  </div>
}

const columns: GridColDef[] = [
  { field: 'repo', headerName: 'Repository', width: 200 },
  { field: 'service_name', headerName: 'Service', width: 250},
  { field: 'maintainer_email', headerName: 'Maintainer', width: 150},
  { field: 'ci_id', headerName: 'ID', width: 90},

  { field: 'open_pr_count', headerName: 'Open PRs', width: 80, type: 'number'},
  { field: 'total_pr_count', headerName: 'Total PRs', width: 80, type: 'number'},
  { field: 'last_master_commit_ci_time', headerName: 'Last Commit', width: 110, type: 'dateTime'},
  { field: 'last_master_commit_ci_status', headerName: 'CI Status', width: 80 },
  { field: 'min_approvers', headerName: 'Min Approvers', width: 80, type: 'number'},
  { field: 'req_status_checks', headerName: 'Status Checks', width: 80},
  { field: 'allow_force', headerName: 'Allow Force', width: 80},

  { field: 'unit_test_result', headerName: 'Unit Test (t/s/f)', width: 120},
  { field: 'sonar_status', headerName: 'Sonar', width: 80},
  { field: 'coverage_result', headerName: 'Coverage', width: 80},
  { field: 'coverage_total_lines', headerName: 'Coverage Lines Checked', width: 100},

  { field: 'veracode_status', headerName: 'Veracode Status', width: 120},
  { field: 'veracode_app', headerName: 'Veracode App', width: 120},
  { field: 'veracode_last_static_scan_date', headerName: 'Veracode Scan Date', width: 120, type: 'dateTime'},
  { field: 'veracode_last_static_scan_result', headerName: 'Veracode Scan Result', width: 120},

  { field: 'veracode_sca_status', headerName: 'SCA Status', width: 100},
  { field: 'veracode_sca_last_scan_date', headerName: 'SCA Scan Date', width: 120, type: 'dateTime'},
  { field: 'veracode_sca_vulnerablility_count', headerName: 'SCA Issues', width: 100, type: 'number'},

  { field: 'technologies', headerName: 'Technologies', width: 200, renderCell: multilineTextRender},
  { field: 'docker_base_image', headerName: 'Docker Base Image', width: 200},
]

const initialState = {
  columns: {
    columnVisibilityModel: {
      total_pr_count: false,
      maintainer_email: false,
      docker_base_image: false,
      allow_force: false,
      coverage_total_lines: false,
      veracode_app: false,
      veracode_last_static_scan_date: false,
      veracode_last_static_scan_result: false,
      veracode_sca_last_scan_date: false,
      veracode_sca_vulnerablility_count: false,
    }
  },
  filter: {
    filterModel: {
      items: [{ columnField: 'service_name', operatorValue: 'isNotEmpty', value: '' }]
    }
  }
}

const infoBar = css({
  backgroundColor: '#333',
  'li': {
    display: 'inline'
  },
})

function CustomFooter(props: { scanDate: string, scanTime: string, orgs: string}) {
  return (
    <GridFooterContainer>
      <Grid container xs={8} sx={{marginLeft: 2}}>
        <Grid xs={4}>Scan Date: {props.scanDate}</Grid>
        <Grid xs={4}>Scan Time: {props.scanTime}</Grid>
        <Grid xs={4}>Orgs: {props.orgs}</Grid>
      </Grid>
      <GridFooter sx={{ border: 'none' }} />
    </GridFooterContainer>
  )
}

// TODO: Export needs to handle line-breaks properly
function BomTable() {
  const [bomIndex, setBomIndex] = useState([]) // Index of all known bom files, newest to oldest
  const [boms, setBoms] = useState([]) // All loaded boms, newest to oldest
  const [bom, setBom] = useState({} as any) // The latest bom, used to render the main grid
  const [bomRows, setBomRows] = useState([] as any[]) // Bom data rendered into row-level data for the grid
  const [loading, setLoading] = useState(false) // True when loading data
  const [error, setError] = useState('')

  async function handleFetchError(error: string) {
    setLoading(false)
    setError(error)
  }

  async function fetchData() {
    if (loading || bomIndex.length > 0) return // In process or already loaded
    setError('')
    setLoading(true)

    try {
      const bomIdxResponse = await fetch(`${import.meta.env.BASE_URL}boms.json`)
      if (!bomIdxResponse.ok) {
        return handleFetchError('Failed to retrieve boms.json')
      }

      const bomIdxData = await bomIdxResponse.json()
      if (bomIdxData.length === 0) {
        return handleFetchError('Failed to parse boms.json')
      }
      setBomIndex(bomIdxData)

      // Get latest BOM data
      const latestBomResponse = await fetch(`${import.meta.env.BASE_URL}${bomIdxData[0]}`)
      if (!latestBomResponse.ok) {
        return handleFetchError('Failed to retrieve latest BOM data file')
      }

      const latestBomData = await latestBomResponse.json()
      if (!latestBomData || !latestBomData.scan_date) {
        return handleFetchError('Failed to parse latest BOM data file')
      }
      const rows = generateBomRowData(latestBomData)

      setBom(latestBomData)
      setBomRows(rows)
    } catch (error) {
      console.error(`Error loading BOM data: ${error}`, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <React.Fragment>
    { bom?.scan_date ? (
      <div css={{ marginTop: 25 }}>
        { /* Setting the height this way isn't ideal but DataGrid requires extrinsic dimensions */ }
        <Grid container sx={{ height: 'calc(100vh - 110px)' }}>
          <Grid xs={12} sx={{ flexGrow: 1 }}>
            <DataGrid
              rows={bomRows}
              columns={columns}
              initialState={initialState}
              components={{
                Toolbar: GridToolbar,
                Footer: CustomFooter
              }}
              componentsProps={{
                footer: {
                  scanDate: new Date(bom.scan_date).toDateString() ?? 'Invalid',
                  scanTime: `${Math.ceil(bom.scan_elapsed_ms/1000)} seconds`,
                  orgs: bom?.orgs?.join(', ')
                }
              }}
              getRowHeight={() => 'auto'}
            />
          </Grid>
        </Grid>
      </div>
      ) : null
    }
    { loading ? (<div>Loading</div>) : null }
    { error ? <div>{error}</div> : null}
    </React.Fragment>
  )
}

export default BomTable
