using IPManagement.API.DTOs;
using IPManagement.API.Services;
using IPManagement.API.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace IPManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UnitsController : ControllerBase
    {
        private readonly IUnitService _unitService;

        public UnitsController(IUnitService unitService)
        {
            _unitService = unitService;
        }

        [HttpGet]
        [RequirePermission(FunctionCode.UNIT, CommandCode.VIEW)]
        public async Task<ActionResult<UnitDto[]>> GetAllUnits()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _unitService.GetAllUnitsAsync(userId);
            return Ok(result);
        }

        [HttpGet("tree")]
        [RequirePermission(FunctionCode.UNIT, CommandCode.VIEW)]
        public async Task<ActionResult<UnitTreeDto[]>> GetUnitTree()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _unitService.GetUnitTreeAsync(userId);
            return Ok(result);
        }

        [HttpGet("{unitId}")]
        [RequirePermission(FunctionCode.UNIT, CommandCode.VIEW)]
        public async Task<ActionResult<UnitDto>> GetUnit(long unitId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _unitService.GetUnitByIdAsync(userId, unitId);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpGet("my-unit")]
        [RequirePermission(FunctionCode.UNIT, CommandCode.VIEW)]
        public async Task<ActionResult<UnitDto>> GetMyUnit()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _unitService.GetMyUnitAsync(userId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not belong to any unit" });
            }
        }

        [HttpGet("selection")]
        [AllowAnonymous]
        public async Task<ActionResult<UnitSelectionDto[]>> GetAllUnitsForSelection()
        {
            var result = await _unitService.GetAllUnitsForSelectionAsync();
            return Ok(result);
        }

        [HttpPost]
        [RequirePermission(FunctionCode.UNIT, CommandCode.CREATE)]
        public async Task<ActionResult<UnitDto>> CreateUnit([FromBody] UnitCreateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _unitService.CreateUnitAsync(userId, request);
                return CreatedAtAction(nameof(GetUnit), new { unitId = result.Id }, result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to create units" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{unitId}")]
        [RequirePermission(FunctionCode.UNIT, CommandCode.UPDATE)]
        public async Task<ActionResult<UnitDto>> UpdateUnit(long unitId, [FromBody] UnitUpdateRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _unitService.UpdateUnitAsync(userId, unitId, request);
                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to update this unit" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{unitId}")]
        [RequirePermission(FunctionCode.UNIT, CommandCode.DELETE)]
        public async Task<ActionResult> DeleteUnit(long unitId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            try
            {
                var result = await _unitService.DeleteUnitAsync(userId, unitId);
                if (!result)
                    return NotFound();

                return NoContent();
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "You do not have permission to delete units" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to delete unit: {ex.Message}" });
            }
        }
    }
}